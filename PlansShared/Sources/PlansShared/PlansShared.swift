import CoreGraphics
import EventKit
import Foundation

public struct PlanItem: Identifiable, Codable, Hashable, Sendable {
    public enum Source: String, Codable, Sendable {
        case calendar
        case text
    }

    public let id: String
    public let title: String
    public let start: Date
    public let end: Date
    public let isAllDay: Bool
    public let location: String?
    public let calendarName: String
    public let calendarColorHex: String
    public let source: Source
    public let confidence: Double?
    public let contactName: String?
    public let isTentative: Bool

    public init(
        id: String,
        title: String,
        start: Date,
        end: Date,
        isAllDay: Bool,
        location: String?,
        calendarName: String,
        calendarColorHex: String,
        source: Source,
        confidence: Double?,
        contactName: String?,
        isTentative: Bool
    ) {
        self.id = id
        self.title = title
        self.start = start
        self.end = end
        self.isAllDay = isAllDay
        self.location = location
        self.calendarName = calendarName
        self.calendarColorHex = calendarColorHex
        self.source = source
        self.confidence = confidence
        self.contactName = contactName
        self.isTentative = isTentative
    }
}

public enum PlanAction: String, Codable, Sendable {
    case create
    case update
    case cancel
}

/// The editable result of local parsing. The original message is deliberately
/// not represented here so it cannot accidentally be persisted.
public struct PlanDraft: Hashable, Sendable {
    public var action: PlanAction
    public var key: String
    public var title: String
    public var start: Date
    public var end: Date
    public var isAllDay: Bool
    public var location: String?
    public var confidence: Double
    public var contactName: String?
    public var isTentative: Bool
    public var detectedDate: Bool

    public init(
        action: PlanAction = .create,
        key: String = UUID().uuidString.lowercased(),
        title: String,
        start: Date,
        end: Date,
        isAllDay: Bool = false,
        location: String? = nil,
        confidence: Double,
        contactName: String? = nil,
        isTentative: Bool = false,
        detectedDate: Bool = true
    ) {
        self.action = action
        self.key = key
        self.title = title
        self.start = start
        self.end = end
        self.isAllDay = isAllDay
        self.location = location
        self.confidence = confidence
        self.contactName = contactName
        self.isTentative = isTentative
        self.detectedDate = detectedDate
    }
}

public struct PlanEventMetadata: Codable, Equatable, Sendable {
    public let v: Int
    public let key: String
    public let confidence: Double
    public let tentative: Bool
    public let contact: String?

    public init(
        v: Int = 1,
        key: String,
        confidence: Double,
        tentative: Bool,
        contact: String?
    ) {
        self.v = v
        self.key = key
        self.confidence = confidence
        self.tentative = tentative
        self.contact = contact
    }
}

public enum SharedSettings {
    public enum Key {
        public static let includedCalendarIDs = "includedCalendarIDs"
        public static let widgetLookaheadDays = "widgetLookaheadDays"
        public static let listLookaheadDays = "listLookaheadDays"
        public static let showAllDayEvents = "showAllDayEvents"
        public static let hideDeclinedEvents = "hideDeclinedEvents"
        public static let plansCalendarID = "plansCalendarID"
    }

    public static var suiteName: String {
        (Bundle.main.object(forInfoDictionaryKey: "PlansAppGroupIdentifier") as? String)
            ?? "group.com.example.plans"
    }

    public static var defaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    public static var calendarSelectionIsConfigured: Bool {
        defaults.object(forKey: Key.includedCalendarIDs) != nil
    }

    public static var includedCalendarIDs: Set<String> {
        get {
            Set(defaults.stringArray(forKey: Key.includedCalendarIDs) ?? [])
        }
        set {
            defaults.set(newValue.sorted(), forKey: Key.includedCalendarIDs)
        }
    }

    public static var widgetLookaheadDays: Int {
        get {
            let value = defaults.integer(forKey: Key.widgetLookaheadDays)
            return value == 0 ? 3 : value
        }
        set {
            defaults.set(max(1, min(newValue, 7)), forKey: Key.widgetLookaheadDays)
        }
    }

    public static var listLookaheadDays: Int {
        get {
            let value = defaults.integer(forKey: Key.listLookaheadDays)
            return value == 0 ? 14 : value
        }
        set {
            defaults.set(max(1, min(newValue, 30)), forKey: Key.listLookaheadDays)
        }
    }

    public static var showAllDayEvents: Bool {
        get {
            defaults.object(forKey: Key.showAllDayEvents) == nil
                ? true
                : defaults.bool(forKey: Key.showAllDayEvents)
        }
        set {
            defaults.set(newValue, forKey: Key.showAllDayEvents)
        }
    }

    public static var hideDeclinedEvents: Bool {
        get {
            defaults.object(forKey: Key.hideDeclinedEvents) == nil
                ? true
                : defaults.bool(forKey: Key.hideDeclinedEvents)
        }
        set {
            defaults.set(newValue, forKey: Key.hideDeclinedEvents)
        }
    }

    public static var plansCalendarID: String? {
        get {
            defaults.string(forKey: Key.plansCalendarID)
        }
        set {
            defaults.set(newValue, forKey: Key.plansCalendarID)
        }
    }
}

public enum CalendarServiceError: LocalizedError {
    case calendarAccessRequired
    case noWritableCalendarSource
    case eventNotFound

    public var errorDescription: String? {
        switch self {
        case .calendarAccessRequired:
            return "Calendar Full Access is required. Open Plans and allow access first."
        case .noWritableCalendarSource:
            return "No writable iCloud calendar source is available."
        case .eventNotFound:
            return "The calendar event could not be found."
        }
    }
}

public enum UpsertResult: Equatable, Sendable {
    case created(String)
    case updated(String)
    case cancelled
    case duplicate(String)
}

public final class CalendarService {
    public static let plansCalendarTitle = "Plans (Texts)"

    public let eventStore: EKEventStore
    private let calendar: Calendar

    public init(eventStore: EKEventStore = EKEventStore(), calendar: Calendar = .autoupdatingCurrent) {
        self.eventStore = eventStore
        self.calendar = calendar
    }

    public var authorizationStatus: EKAuthorizationStatus {
        EKEventStore.authorizationStatus(for: .event)
    }

    @discardableResult
    public func requestFullAccess() async throws -> Bool {
        try await eventStore.requestFullAccessToEvents()
    }

    public func event(withIdentifier identifier: String) -> EKEvent? {
        eventStore.event(withIdentifier: identifier)
            ?? eventStore.calendarItem(withIdentifier: identifier) as? EKEvent
    }

    public func allEventCalendars() -> [EKCalendar] {
        eventStore.calendars(for: .event)
            .filter { $0.type != .birthday }
            .sorted {
                if $0.source.title == $1.source.title {
                    return $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending
                }
                return $0.source.title.localizedCaseInsensitiveCompare($1.source.title) == .orderedAscending
            }
    }

    public func plansCalendar() throws -> EKCalendar {
        guard authorizationStatus == .fullAccess else {
            throw CalendarServiceError.calendarAccessRequired
        }

        if let identifier = SharedSettings.plansCalendarID,
           let saved = eventStore.calendar(withIdentifier: identifier),
           saved.allowsContentModifications {
            return saved
        }

        if let existing = eventStore.calendars(for: .event).first(where: {
            $0.title == Self.plansCalendarTitle && $0.allowsContentModifications
        }) {
            SharedSettings.plansCalendarID = existing.calendarIdentifier
            return existing
        }

        guard let source = preferredWritableSource() else {
            throw CalendarServiceError.noWritableCalendarSource
        }

        let created = EKCalendar(for: .event, eventStore: eventStore)
        created.title = Self.plansCalendarTitle
        created.source = source
        created.cgColor = CGColor(
            colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
            components: [0.0, 0.62, 0.62, 1.0]
        )
        try eventStore.saveCalendar(created, commit: true)
        SharedSettings.plansCalendarID = created.calendarIdentifier
        return created
    }

    public func upcoming(
        from: Date,
        days: Int,
        calendarIDs: Set<String>,
        showAllDay: Bool = SharedSettings.showAllDayEvents,
        hideDeclined: Bool = SharedSettings.hideDeclinedEvents
    ) -> [PlanItem] {
        guard authorizationStatus == .fullAccess,
              let end = calendar.date(byAdding: .day, value: max(1, days), to: from) else {
            return []
        }

        let selectedCalendars: [EKCalendar]?
        if calendarIDs.isEmpty {
            selectedCalendars = nil
        } else {
            selectedCalendars = calendarIDs.compactMap(eventStore.calendar(withIdentifier:))
            if selectedCalendars?.isEmpty == true {
                return []
            }
        }

        let predicate = eventStore.predicateForEvents(
            withStart: from,
            end: end,
            calendars: selectedCalendars
        )
        let plansCalendarID = SharedSettings.plansCalendarID

        return eventStore.events(matching: predicate)
            .filter { event in
                guard event.endDate > from, event.status != .canceled else {
                    return false
                }
                if !showAllDay && event.isAllDay {
                    return false
                }
                if hideDeclined,
                   event.attendees?.first(where: \.isCurrentUser)?.participantStatus == .declined {
                    return false
                }
                return true
            }
            .map { event in
                let metadata = Self.decodeMetadata(from: event.notes)
                let source: PlanItem.Source =
                    event.calendar.calendarIdentifier == plansCalendarID
                    || event.calendar.title == Self.plansCalendarTitle
                    ? .text
                    : .calendar

                return PlanItem(
                    id: event.eventIdentifier ?? event.calendarItemIdentifier,
                    title: event.title ?? "Untitled event",
                    start: event.startDate,
                    end: event.endDate,
                    isAllDay: event.isAllDay,
                    location: event.location,
                    calendarName: event.calendar.title,
                    calendarColorHex: Self.hexColor(event.calendar.cgColor),
                    source: source,
                    confidence: source == .text ? metadata?.confidence : nil,
                    contactName: source == .text ? metadata?.contact : nil,
                    isTentative: event.availability == .tentative || metadata?.tentative == true
                )
            }
            .sorted { lhs, rhs in
                let lhsDay = calendar.startOfDay(for: lhs.start)
                let rhsDay = calendar.startOfDay(for: rhs.start)
                if lhsDay != rhsDay {
                    return lhsDay < rhsDay
                }
                if lhs.isAllDay != rhs.isAllDay {
                    return lhs.isAllDay
                }
                return lhs.start < rhs.start
            }
    }

    @discardableResult
    public func upsert(plan: PlanDraft) throws -> UpsertResult {
        guard authorizationStatus == .fullAccess else {
            throw CalendarServiceError.calendarAccessRequired
        }

        let targetCalendar = try plansCalendar()
        let matching = matchingEvent(key: plan.key, calendar: targetCalendar, around: plan.start)

        if plan.action == .cancel {
            guard let matching else {
                return .cancelled
            }
            try eventStore.remove(matching, span: .thisEvent, commit: true)
            return .cancelled
        }

        if matching == nil, let duplicate = duplicateEvent(for: plan, excluding: targetCalendar) {
            return .duplicate(duplicate.eventIdentifier ?? duplicate.calendarItemIdentifier)
        }

        let event = matching ?? EKEvent(eventStore: eventStore)
        event.calendar = targetCalendar
        event.title = plan.title.trimmingCharacters(in: .whitespacesAndNewlines)
        event.startDate = plan.start
        event.endDate = max(plan.end, plan.start.addingTimeInterval(60))
        event.isAllDay = plan.isAllDay
        event.location = plan.location?.nilIfBlank
        event.availability = plan.isTentative ? .tentative : .busy
        event.url = Self.planURL(for: plan.key)

        let metadata = PlanEventMetadata(
            key: plan.key,
            confidence: plan.confidence,
            tentative: plan.isTentative,
            contact: plan.contactName?.nilIfBlank
        )
        event.notes = Self.encodeMetadata(metadata)

        event.alarms = plan.confidence >= 0.8
            ? [EKAlarm(relativeOffset: -30 * 60)]
            : nil

        try eventStore.save(event, span: .thisEvent, commit: true)
        let identifier = event.eventIdentifier ?? event.calendarItemIdentifier
        return matching == nil ? .created(identifier) : .updated(identifier)
    }

    public static func encodeMetadata(_ metadata: PlanEventMetadata) -> String? {
        guard let data = try? JSONEncoder().encode(metadata) else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    public static func decodeMetadata(from notes: String?) -> PlanEventMetadata? {
        guard let notes, let data = notes.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(PlanEventMetadata.self, from: data)
    }

    private func preferredWritableSource() -> EKSource? {
        let sources = eventStore.sources

        if let iCloud = sources.first(where: {
            $0.sourceType == .calDAV
                && $0.title.localizedCaseInsensitiveContains("icloud")
        }) {
            return iCloud
        }

        if let defaultSource = eventStore.defaultCalendarForNewEvents?.source,
           defaultSource.sourceType == .calDAV {
            return defaultSource
        }

        return sources.first(where: { source in
            (source.sourceType == .calDAV || source.sourceType == .local)
                && source.calendars(for: .event).contains(where: \.allowsContentModifications)
        })
    }

    private func matchingEvent(key: String, calendar: EKCalendar, around date: Date) -> EKEvent? {
        let start = self.calendar.date(byAdding: .day, value: -30, to: date) ?? date
        let end = self.calendar.date(byAdding: .day, value: 30, to: date) ?? date
        let predicate = eventStore.predicateForEvents(
            withStart: start,
            end: end,
            calendars: [calendar]
        )
        let expectedURL = Self.planURL(for: key)
        return eventStore.events(matching: predicate).first { $0.url == expectedURL }
    }

    private func duplicateEvent(for plan: PlanDraft, excluding targetCalendar: EKCalendar) -> EKEvent? {
        let start = plan.start.addingTimeInterval(-60 * 60)
        let end = plan.start.addingTimeInterval(60 * 60)
        let calendars = eventStore.calendars(for: .event).filter {
            $0.calendarIdentifier != targetCalendar.calendarIdentifier
        }
        let predicate = eventStore.predicateForEvents(
            withStart: start,
            end: end,
            calendars: calendars
        )
        let planWords = Self.significantWords(in: plan.title)

        return eventStore.events(matching: predicate).first { event in
            let commonWords = planWords.intersection(Self.significantWords(in: event.title ?? ""))
            return commonWords.count >= 2
        }
    }

    private static func planURL(for key: String) -> URL? {
        var components = URLComponents()
        components.scheme = "plans"
        components.host = "key"
        components.path = "/\(key)"
        return components.url
    }

    private static func significantWords(in title: String) -> Set<String> {
        let stopWords: Set<String> = [
            "and", "for", "from", "the", "with", "your", "you", "our", "this",
            "that", "plan", "meet", "meeting"
        ]
        return Set(
            title.lowercased()
                .components(separatedBy: CharacterSet.alphanumerics.inverted)
                .filter { $0.count > 2 && !stopWords.contains($0) }
        )
    }

    private static func hexColor(_ color: CGColor?) -> String {
        guard let color,
              let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let converted = color.converted(
                  to: colorSpace,
                  intent: .defaultIntent,
                  options: nil
              ),
              let components = converted.components,
              components.count >= 3 else {
            return "#00A0A0"
        }

        return String(
            format: "#%02X%02X%02X",
            Int((components[0] * 255).rounded()),
            Int((components[1] * 255).rounded()),
            Int((components[2] * 255).rounded())
        )
    }
}

public struct LocalPlanParser {
    private let calendar: Calendar
    private let locale: Locale

    public init(calendar: Calendar = .autoupdatingCurrent, locale: Locale = .autoupdatingCurrent) {
        self.calendar = calendar
        self.locale = locale
    }

    public func parse(_ text: String, now: Date = Date()) -> PlanDraft {
        let normalized = text
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let detection = detectDate(in: normalized, now: now)
        let explicitTime = detection.hasExplicitTime
        let detectedDate = detection.wasDetected
        let isAllDay = detectedDate && !explicitTime
        let start = isAllDay ? calendar.startOfDay(for: detection.start) : detection.start

        let defaultHours = Self.defaultDurationHours(for: normalized)
        let end: Date
        if isAllDay {
            end = calendar.date(byAdding: .day, value: 1, to: start)
                ?? start.addingTimeInterval(24 * 60 * 60)
        } else if detection.duration > 0 {
            end = start.addingTimeInterval(detection.duration)
        } else {
            end = start.addingTimeInterval(defaultHours * 60 * 60)
        }

        let tentative = Self.containsTentativeLanguage(normalized)
        let contact = Self.extractContact(from: normalized)
        let location = Self.extractLocation(from: normalized, removing: detection.matchedText)
        let title = Self.makeTitle(from: normalized, contact: contact)

        var confidence: Double
        if explicitTime {
            confidence = 0.88
        } else if detectedDate {
            confidence = 0.68
        } else {
            confidence = 0.30
        }
        if tentative {
            confidence = min(confidence, 0.55)
        }

        return PlanDraft(
            title: title,
            start: start,
            end: end,
            isAllDay: isAllDay,
            location: location,
            confidence: confidence,
            contactName: contact,
            isTentative: tentative,
            detectedDate: detectedDate
        )
    }

    private struct DateDetection {
        let start: Date
        let duration: TimeInterval
        let matchedText: String?
        let hasExplicitTime: Bool
        let wasDetected: Bool
    }

    private struct TimeDetection {
        let hour: Int
        let minute: Int
        let matchedText: String
    }

    private func detectDate(in text: String, now: Date) -> DateDetection {
        let time = Self.detectTime(in: text)

        if let relativeDay = relativeDay(in: text, now: now) {
            var start = relativeDay.date
            if let time {
                start = calendar.date(
                    bySettingHour: time.hour,
                    minute: time.minute,
                    second: 0,
                    of: start
                ) ?? start

                // An unqualified weekday means the next occurrence if today's
                // stated time has already passed.
                if relativeDay.isWeekday, start <= now {
                    start = calendar.date(byAdding: .day, value: 7, to: start) ?? start
                }
            }
            return DateDetection(
                start: start,
                duration: 0,
                matchedText: relativeDay.matchedText,
                hasExplicitTime: time != nil,
                wasDetected: true
            )
        }

        if Self.containsAbsoluteDateCue(text),
           let detector = try? NSDataDetector(
               types: NSTextCheckingResult.CheckingType.date.rawValue
           ) {
            let range = NSRange(text.startIndex..., in: text)
            if let match = detector.firstMatch(in: text, options: [], range: range),
               var start = match.date {
                if let time {
                    start = calendar.date(
                        bySettingHour: time.hour,
                        minute: time.minute,
                        second: 0,
                        of: start
                    ) ?? start
                }
                let matchedText = Range(match.range, in: text).map { String(text[$0]) }
                return DateDetection(
                    start: start,
                    duration: match.duration,
                    matchedText: matchedText,
                    hasExplicitTime: time != nil || Self.containsExplicitTime(matchedText ?? ""),
                    wasDetected: true
                )
            }
        }

        if let time {
            var start = calendar.date(
                bySettingHour: time.hour,
                minute: time.minute,
                second: 0,
                of: now
            ) ?? now
            if start <= now {
                start = calendar.date(byAdding: .day, value: 1, to: start) ?? start
            }
            return DateDetection(
                start: start,
                duration: 0,
                matchedText: time.matchedText,
                hasExplicitTime: true,
                wasDetected: true
            )
        }

        return DateDetection(
            start: Self.nextWholeHour(after: now, calendar: calendar),
            duration: 0,
            matchedText: nil,
            hasExplicitTime: false,
            wasDetected: false
        )
    }

    private func relativeDay(
        in text: String,
        now: Date
    ) -> (date: Date, matchedText: String, isWeekday: Bool)? {
        let startOfToday = calendar.startOfDay(for: now)
        let simpleRelativeDays = [
            ("\\btoday\\b", 0),
            ("\\btomorrow\\b", 1)
        ]
        for (pattern, offset) in simpleRelativeDays {
            if let match = Self.firstMatch(pattern: pattern, in: text),
               let range = Range(match.range, in: text),
               let date = calendar.date(byAdding: .day, value: offset, to: startOfToday) {
                return (date, String(text[range]), false)
            }
        }

        let weekdays: [(pattern: String, weekday: Int)] = [
            ("sun(?:day)?", 1),
            ("mon(?:day)?", 2),
            ("tue(?:sday)?", 3),
            ("wed(?:nesday)?", 4),
            ("thu(?:rsday)?", 5),
            ("fri(?:day)?", 6),
            ("sat(?:urday)?", 7)
        ]
        let currentWeekday = calendar.component(.weekday, from: now)

        for weekday in weekdays {
            let pattern = "\\b(?:(next)\\s+)?(\(weekday.pattern))\\b"
            guard let match = Self.firstMatch(pattern: pattern, in: text),
                  let range = Range(match.range, in: text) else {
                continue
            }
            var daysAhead = (weekday.weekday - currentWeekday + 7) % 7
            if match.range(at: 1).location != NSNotFound {
                daysAhead += 7
            }
            guard let date = calendar.date(
                byAdding: .day,
                value: daysAhead,
                to: startOfToday
            ) else {
                continue
            }
            return (date, String(text[range]), true)
        }

        return nil
    }

    private static func detectTime(in text: String) -> TimeDetection? {
        let twelveHourPattern =
            "\\b(1[0-2]|0?[1-9])(?::([0-5]\\d))?\\s*(a\\.?m\\.?|p\\.?m\\.?)\\b"
        if let match = firstMatch(pattern: twelveHourPattern, in: text),
           let hour = integerCapture(1, from: match, in: text),
           let range = Range(match.range, in: text) {
            let minute = integerCapture(2, from: match, in: text) ?? 0
            let marker = stringCapture(3, from: match, in: text)?.lowercased() ?? ""
            let adjustedHour = marker.hasPrefix("p") && hour != 12
                ? hour + 12
                : (marker.hasPrefix("a") && hour == 12 ? 0 : hour)
            return TimeDetection(
                hour: adjustedHour,
                minute: minute,
                matchedText: String(text[range])
            )
        }

        let twentyFourHourPattern = "\\b([01]?\\d|2[0-3]):([0-5]\\d)\\b"
        if let match = firstMatch(pattern: twentyFourHourPattern, in: text),
           let hour = integerCapture(1, from: match, in: text),
           let minute = integerCapture(2, from: match, in: text),
           let range = Range(match.range, in: text) {
            return TimeDetection(
                hour: hour,
                minute: minute,
                matchedText: String(text[range])
            )
        }

        if let match = firstMatch(pattern: "\\b(noon|midnight)\\b", in: text),
           let marker = stringCapture(1, from: match, in: text)?.lowercased(),
           let range = Range(match.range, in: text) {
            return TimeDetection(
                hour: marker == "noon" ? 12 : 0,
                minute: 0,
                matchedText: String(text[range])
            )
        }

        let conversationalPattern = "\\b(?:at|@)\\s+(1[0-2]|0?[1-9])\\b"
        if let match = firstMatch(pattern: conversationalPattern, in: text),
           let hour = integerCapture(1, from: match, in: text),
           let range = Range(match.range, in: text) {
            return TimeDetection(
                hour: hour == 12 ? 12 : hour + 12,
                minute: 0,
                matchedText: String(text[range])
            )
        }

        return nil
    }

    private static func makeTitle(from text: String, contact: String?) -> String {
        let activityPatterns: [(String, String)] = [
            ("\\bbrunch\\b", "Brunch"),
            ("\\bbreakfast\\b", "Breakfast"),
            ("\\blunch\\b", "Lunch"),
            ("\\bdinner\\b", "Dinner"),
            ("\\bcoffee\\b", "Coffee"),
            ("\\bdrinks?\\b", "Drinks"),
            ("\\bmovies?\\b", "Movie"),
            ("\\bconcert\\b", "Concert"),
            ("\\bparty\\b", "Party"),
            ("\\bmeeting\\b", "Meeting")
        ]

        for (pattern, activity) in activityPatterns
        where text.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil {
            if let contact {
                return "\(activity) with \(contact)"
            }
            return activity
        }

        var cleaned = text
            .replacingOccurrences(
                of: "^(hey[!,]?\\s*)?(let'?s|want to|can we|could we|how about)\\s+",
                with: "",
                options: [.regularExpression, .caseInsensitive]
            )
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters))

        if cleaned.isEmpty {
            cleaned = contact.map { "Plan with \($0)" } ?? "New plan"
        }

        let capped = String(cleaned.prefix(80))
        return capped.prefix(1).uppercased() + String(capped.dropFirst())
    }

    private static func extractContact(from text: String) -> String? {
        guard let regex = try? NSRegularExpression(
            pattern: "\\bwith\\s+([\\p{L}][\\p{L}'’.-]*(?:\\s+[\\p{L}][\\p{L}'’.-]*){0,2}?)(?=\\s+(?:at|on|this|next|today|tomorrow|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\\b|[,.?!]|$)",
            options: .caseInsensitive
        ) else {
            return nil
        }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, range: range),
              let capture = Range(match.range(at: 1), in: text) else {
            return nil
        }
        return String(text[capture])
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .capitalized
    }

    private static func extractLocation(from text: String, removing dateText: String?) -> String? {
        var candidate = text
        if let dateText {
            candidate = candidate.replacingOccurrences(of: dateText, with: " ")
        }

        guard let regex = try? NSRegularExpression(
            pattern: "\\b(?:at|@)\\s+([\\p{L}][\\p{L}\\d '&.’-]{1,40}?)(?=\\s+(?:today|tomorrow|next|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?))\\b|[,.?!]|$)",
            options: .caseInsensitive
        ) else {
            return nil
        }
        let range = NSRange(candidate.startIndex..., in: candidate)
        guard let match = regex.firstMatch(in: candidate, range: range),
              let capture = Range(match.range(at: 1), in: candidate) else {
            return nil
        }
        return String(candidate[capture])
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(.punctuationCharacters))
            .nilIfBlank
    }

    private static func containsAbsoluteDateCue(_ text: String) -> Bool {
        text.range(
            of: "\\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\s+\\d{1,2}\\b|\\b\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?\\b|\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b",
            options: [.regularExpression, .caseInsensitive]
        ) != nil
    }

    private static func containsExplicitTime(_ text: String) -> Bool {
        text.range(
            of: "\\b\\d{1,2}:\\d{2}\\b",
            options: [.regularExpression, .caseInsensitive]
        ) != nil
            || text.range(
                of: "\\b\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)\\b",
                options: [.regularExpression, .caseInsensitive]
            ) != nil
            || text.range(
                of: "\\b(?:at|@)\\s+(?:[01]?\\d|2[0-3])\\b",
                options: [.regularExpression, .caseInsensitive]
            ) != nil
            || text.range(
                of: "\\b(?:noon|midnight)\\b",
                options: [.regularExpression, .caseInsensitive]
            ) != nil
    }

    private static func firstMatch(
        pattern: String,
        in text: String
    ) -> NSTextCheckingResult? {
        guard let regex = try? NSRegularExpression(
            pattern: pattern,
            options: .caseInsensitive
        ) else {
            return nil
        }
        return regex.firstMatch(
            in: text,
            options: [],
            range: NSRange(text.startIndex..., in: text)
        )
    }

    private static func stringCapture(
        _ index: Int,
        from match: NSTextCheckingResult,
        in text: String
    ) -> String? {
        guard match.numberOfRanges > index,
              match.range(at: index).location != NSNotFound,
              let range = Range(match.range(at: index), in: text) else {
            return nil
        }
        return String(text[range])
    }

    private static func integerCapture(
        _ index: Int,
        from match: NSTextCheckingResult,
        in text: String
    ) -> Int? {
        stringCapture(index, from: match, in: text).flatMap(Int.init)
    }

    private static func containsTentativeLanguage(_ text: String) -> Bool {
        text.range(
            of: "\\b(?:maybe|might|tentative(?:ly)?|if i(?:'m| am) free|aim for|hopefully|probably|possibly)\\b",
            options: [.regularExpression, .caseInsensitive]
        ) != nil
    }

    private static func defaultDurationHours(for text: String) -> Double {
        if text.range(
            of: "\\b(?:dinner|lunch|brunch)\\b",
            options: [.regularExpression, .caseInsensitive]
        ) != nil {
            return 2
        }
        if text.range(
            of: "\\b(?:party|concert|festival)\\b",
            options: [.regularExpression, .caseInsensitive]
        ) != nil {
            return 3
        }
        return 1
    }

    private static func nextWholeHour(after date: Date, calendar: Calendar) -> Date {
        let nextHour = calendar.date(byAdding: .hour, value: 1, to: date) ?? date
        return calendar.date(
            bySettingHour: calendar.component(.hour, from: nextHour),
            minute: 0,
            second: 0,
            of: nextHour
        ) ?? nextHour
    }
}

private extension String {
    var nilIfBlank: String? {
        trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : self
    }
}
