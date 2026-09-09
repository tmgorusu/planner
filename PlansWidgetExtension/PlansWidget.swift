import EventKit
import PlansShared
import SwiftUI
import UIKit
import WidgetKit

@main
struct PlansWidgetBundle: WidgetBundle {
    var body: some Widget {
        PlansWidget()
    }
}

struct PlansWidget: Widget {
    let kind = "PlansWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PlansTimelineProvider()) { entry in
            PlansWidgetEntryView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.widgetBackground
                }
        }
        .configurationDisplayName("Plans")
        .description("Meetings and plans from your selected calendars.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryRectangular,
            .accessoryInline,
            .accessoryCircular
        ])
    }
}

struct PlansEntry: TimelineEntry {
    let date: Date
    let items: [PlanItem]
    let hasCalendarAccess: Bool
}

struct PlansTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> PlansEntry {
        PlansEntry(
            date: Date(),
            items: [
                PlanItem(
                    id: "preview",
                    title: "Coffee with Sam",
                    start: Date(timeIntervalSinceNow: 45 * 60),
                    end: Date(timeIntervalSinceNow: 105 * 60),
                    isAllDay: false,
                    location: "Neighborhood Cafe",
                    calendarName: "Plans (Texts)",
                    calendarColorHex: "#00A0A0",
                    source: .text,
                    confidence: 0.9,
                    contactName: "Sam",
                    isTentative: false
                )
            ],
            hasCalendarAccess: true
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (PlansEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
        } else {
            completion(loadEntry(at: Date()))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PlansEntry>) -> Void) {
        let now = Date()
        let current = loadEntry(at: now)
        let dates = timelineDates(now: now, items: current.items)
        let entries = dates.map {
            PlansEntry(
                date: $0,
                items: current.items,
                hasCalendarAccess: current.hasCalendarAccess
            )
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }

    private func loadEntry(at date: Date) -> PlansEntry {
        let service = CalendarService()
        guard service.authorizationStatus == .fullAccess else {
            return PlansEntry(date: date, items: [], hasCalendarAccess: false)
        }

        let allCalendars = service.allEventCalendars()
        let calendarIDs = SharedSettings.calendarSelectionIsConfigured
            ? SharedSettings.includedCalendarIDs
            : Set(allCalendars.map(\.calendarIdentifier))
        let startOfToday = Calendar.autoupdatingCurrent.startOfDay(for: date)
        let items = service.upcoming(
            from: startOfToday,
            days: SharedSettings.widgetLookaheadDays + 1,
            calendarIDs: calendarIDs
        )

        return PlansEntry(date: date, items: items, hasCalendarAccess: true)
    }

    private func timelineDates(now: Date, items: [PlanItem]) -> [Date] {
        let lookaheadEnd = Calendar.autoupdatingCurrent.date(
            byAdding: .day,
            value: SharedSettings.widgetLookaheadDays,
            to: now
        ) ?? now.addingTimeInterval(3 * 24 * 60 * 60)
        let sixHours = now.addingTimeInterval(6 * 60 * 60)
        var dates: Set<Date> = [now]

        var quarterHour = now.addingTimeInterval(15 * 60)
        while quarterHour <= sixHours {
            dates.insert(quarterHour)
            quarterHour = quarterHour.addingTimeInterval(15 * 60)
        }

        // Coarse entries keep the timeline bounded while still ensuring .atEnd
        // never leaves the widget without an entry for several days.
        var coarseRefresh = sixHours.addingTimeInterval(6 * 60 * 60)
        while coarseRefresh <= lookaheadEnd {
            dates.insert(coarseRefresh)
            coarseRefresh = coarseRefresh.addingTimeInterval(6 * 60 * 60)
        }

        for item in items {
            if item.start > now, item.start <= lookaheadEnd {
                dates.insert(item.start)
            }
            if item.end > now, item.end <= lookaheadEnd {
                dates.insert(item.end)
            }
        }

        return dates.sorted()
    }
}

struct PlansWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PlansEntry

    var body: some View {
        Group {
            if !entry.hasCalendarAccess {
                permissionRequired
            } else {
                switch family {
                case .systemSmall:
                    SmallPlansView(entry: entry)
                case .systemMedium:
                    MediumPlansView(entry: entry)
                case .systemLarge:
                    LargePlansView(entry: entry)
                case .accessoryRectangular:
                    RectangularPlansView(entry: entry)
                case .accessoryInline:
                    InlinePlansView(entry: entry)
                case .accessoryCircular:
                    CircularPlansView(entry: entry)
                default:
                    SmallPlansView(entry: entry)
                }
            }
        }
        .widgetURL(nextItem.flatMap(\.widgetURL))
    }

    private var nextItem: PlanItem? {
        entry.items.first { $0.end > entry.date }
    }

    @ViewBuilder
    private var permissionRequired: some View {
        switch family {
        case .accessoryInline:
            Text("Open Plans to allow Calendar access")
        case .accessoryCircular:
            Image(systemName: "calendar.badge.exclamationmark")
        default:
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "calendar.badge.exclamationmark")
                Text("Open Plans")
                    .font(.headline)
                Text("Calendar access is required.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct SmallPlansView: View {
    let entry: PlansEntry

    var body: some View {
        if let item = entry.items.first(where: { $0.end > entry.date }) {
            VStack(alignment: .leading, spacing: 7) {
                CalendarDot(item: item)

                Spacer(minLength: 0)

                Text(item.displayTitle)
                    .font(.headline)
                    .italic(item.isUncertain)
                    .lineLimit(3)

                TimeStatus(item: item, date: entry.date)
                    .font(.subheadline.weight(.semibold))

                if let location = item.location, !location.isEmpty {
                    Label(location, systemImage: "location.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        } else {
            EmptyPlansView(items: entry.items, date: entry.date)
        }
    }
}

private struct MediumPlansView: View {
    let entry: PlansEntry

    var body: some View {
        let calendar = Calendar.autoupdatingCurrent
        let remaining = entry.items.filter { $0.end > entry.date }
        let today = remaining.filter { calendar.isDateInToday($0.start) }
        let rows = today.isEmpty
            ? remaining.filter { calendar.isDateInTomorrow($0.start) }
            : today

        VStack(alignment: .leading, spacing: 7) {
            Text(today.isEmpty && !rows.isEmpty ? "Tomorrow" : "Today")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)

            if rows.isEmpty {
                EmptyPlansView(items: entry.items, date: entry.date)
            } else {
                ForEach(Array(rows.prefix(4))) { item in
                    Link(destination: item.widgetURL ?? URL(string: "plans://")!) {
                        WidgetPlanRow(item: item, date: entry.date)
                    }
                }
            }
            Spacer(minLength: 0)
        }
    }
}

private struct LargePlansView: View {
    let entry: PlansEntry

    var body: some View {
        let calendar = Calendar.autoupdatingCurrent
        let remaining = entry.items.filter { $0.end > entry.date }
        let today = Array(remaining.filter { calendar.isDateInToday($0.start) }.prefix(5))
        let tomorrowLimit = max(0, 8 - today.count)
        let tomorrow = Array(
            remaining
                .filter { calendar.isDateInTomorrow($0.start) }
                .prefix(tomorrowLimit)
        )

        VStack(alignment: .leading, spacing: 9) {
            if today.isEmpty && tomorrow.isEmpty {
                EmptyPlansView(items: entry.items, date: entry.date)
            } else {
                WidgetSection(title: "Today", items: today, date: entry.date)
                if !tomorrow.isEmpty {
                    Divider()
                    WidgetSection(title: "Tomorrow", items: tomorrow, date: entry.date)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

private struct RectangularPlansView: View {
    let entry: PlansEntry

    var body: some View {
        if let item = entry.items.first(where: { $0.end > entry.date }) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.displayTitle)
                    .font(.headline)
                    .italic(item.isUncertain)
                    .lineLimit(1)
                TimeStatus(item: item, date: entry.date)
                    .font(.caption)
                if let location = item.location {
                    Text(location)
                        .font(.caption2)
                        .lineLimit(1)
                }
            }
        } else {
            Text("Nothing scheduled 🎉")
        }
    }
}

private struct InlinePlansView: View {
    let entry: PlansEntry

    var body: some View {
        if let item = entry.items.first(where: { $0.end > entry.date }) {
            Label(
                "\(item.shortTime) \(item.displayTitle)",
                systemImage: item.source == .text ? "message.fill" : "calendar"
            )
        } else {
            Label("Nothing scheduled", systemImage: "calendar")
        }
    }
}

private struct CircularPlansView: View {
    let entry: PlansEntry

    var body: some View {
        let count = entry.items.filter {
            Calendar.autoupdatingCurrent.isDateInToday($0.start) && $0.end > entry.date
        }.count

        Gauge(value: Double(count), in: 0...Double(max(count, 6))) {
            Image(systemName: "calendar")
        } currentValueLabel: {
            Text("\(count)")
                .font(.headline)
        }
        .gaugeStyle(.accessoryCircular)
        .accessibilityLabel("\(count) events left today")
    }
}

private struct WidgetSection: View {
    let title: String
    let items: [PlanItem]
    let date: Date

    var body: some View {
        if !items.isEmpty {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
            ForEach(items) { item in
                Link(destination: item.widgetURL ?? URL(string: "plans://")!) {
                    WidgetPlanRow(item: item, date: date)
                }
            }
        }
    }
}

private struct WidgetPlanRow: View {
    let item: PlanItem
    let date: Date

    var body: some View {
        HStack(spacing: 7) {
            Circle()
                .fill(Color(planHex: item.calendarColorHex))
                .frame(width: 7, height: 7)

            Text(item.displayTitle)
                .font(.subheadline.weight(.medium))
                .italic(item.isUncertain)
                .lineLimit(1)

            if item.source == .text {
                Image(systemName: "message.fill")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 4)

            if item.isAllDay {
                Text("All day")
            } else if item.start <= date && item.end > date {
                Text("Now")
            } else {
                Text(item.start, style: .time)
            }
        }
        .font(.caption)
        .foregroundStyle(.primary)
    }
}

private struct CalendarDot: View {
    let item: PlanItem

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(Color(planHex: item.calendarColorHex))
                .frame(width: 8, height: 8)
            Text(item.calendarName)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            if item.source == .text {
                Image(systemName: "message.fill")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct TimeStatus: View {
    let item: PlanItem
    let date: Date

    var body: some View {
        if item.isAllDay {
            Text("All day")
        } else if item.start <= date && item.end > date {
            Text("Now")
        } else {
            Text(item.start, style: .relative)
        }
    }
}

private struct EmptyPlansView: View {
    let items: [PlanItem]
    let date: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Nothing scheduled 🎉")
                .font(.headline)
            if let tomorrow = items.first(where: {
                Calendar.autoupdatingCurrent.isDateInTomorrow($0.start)
            }) {
                Text("Tomorrow: \(tomorrow.shortTime) \(tomorrow.title)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
    }
}

private extension PlanItem {
    var isUncertain: Bool {
        isTentative || (confidence ?? 1) < 0.6
    }

    var displayTitle: String {
        "\(title)\(isUncertain ? "?" : "")"
    }

    var shortTime: String {
        isAllDay ? "All day" : start.formatted(date: .omitted, time: .shortened)
    }

    var widgetURL: URL? {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        guard let encodedID = id.addingPercentEncoding(withAllowedCharacters: allowed) else {
            return nil
        }
        return URL(string: "plans://event/\(encodedID)")
    }
}

private extension Color {
    static let widgetBackground = Color(
        uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0.07, green: 0.08, blue: 0.10, alpha: 1)
                : UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
        }
    )

    init(planHex: String) {
        let cleaned = planHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}
