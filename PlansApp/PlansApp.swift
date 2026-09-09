import AppIntents
import BackgroundTasks
import EventKit
import EventKitUI
import Foundation
import PlansShared
import SwiftUI
import UIKit
import WidgetKit

@main
struct PlansApp: App {
    @StateObject private var model = PlansAppModel()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        BackgroundRefreshController.register()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(model)
                .task {
                    await model.start()
                }
                .onOpenURL { url in
                    model.open(url: url)
                }
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                BackgroundRefreshController.schedule()
            }
        }
    }
}

@MainActor
final class PlansAppModel: ObservableObject {
    struct EventSelection: Identifiable {
        let id: String
    }

    @Published private(set) var authorizationStatus = EKEventStore.authorizationStatus(for: .event)
    @Published private(set) var events: [PlanItem] = []
    @Published private(set) var calendars: [EKCalendar] = []
    @Published private(set) var errorMessage: String?
    @Published var selectedEvent: EventSelection?

    @Published var includedCalendarIDs = SharedSettings.includedCalendarIDs
    @Published var widgetLookaheadDays = SharedSettings.widgetLookaheadDays
    @Published var listLookaheadDays = SharedSettings.listLookaheadDays
    @Published var showAllDayEvents = SharedSettings.showAllDayEvents
    @Published var hideDeclinedEvents = SharedSettings.hideDeclinedEvents

    let calendarService: CalendarService
    private var eventStoreObserver: NSObjectProtocol?

    init(calendarService: CalendarService = CalendarService()) {
        self.calendarService = calendarService
        eventStoreObserver = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                await self?.reload()
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }

    deinit {
        if let eventStoreObserver {
            NotificationCenter.default.removeObserver(eventStoreObserver)
        }
    }

    func start() async {
        authorizationStatus = calendarService.authorizationStatus
        guard authorizationStatus == .fullAccess else {
            return
        }
        await prepareAndReload()
    }

    func requestCalendarAccess() async {
        do {
            _ = try await calendarService.requestFullAccess()
            authorizationStatus = calendarService.authorizationStatus
            if authorizationStatus == .fullAccess {
                await prepareAndReload()
            }
        } catch {
            errorMessage = error.localizedDescription
            authorizationStatus = calendarService.authorizationStatus
        }
    }

    func reload() async {
        authorizationStatus = calendarService.authorizationStatus
        guard authorizationStatus == .fullAccess else {
            events = []
            calendars = []
            return
        }

        calendars = calendarService.allEventCalendars()
        events = calendarService.upcoming(
            from: Date(),
            days: listLookaheadDays,
            calendarIDs: includedCalendarIDs,
            showAllDay: showAllDayEvents,
            hideDeclined: hideDeclinedEvents
        )
        errorMessage = nil
    }

    func setCalendar(_ identifier: String, included: Bool) {
        if included {
            includedCalendarIDs.insert(identifier)
        } else {
            includedCalendarIDs.remove(identifier)
        }
        SharedSettings.includedCalendarIDs = includedCalendarIDs
        refreshAfterSettingsChange()
    }

    func setWidgetLookahead(_ value: Int) {
        widgetLookaheadDays = value
        SharedSettings.widgetLookaheadDays = value
        WidgetCenter.shared.reloadAllTimelines()
    }

    func setListLookahead(_ value: Int) {
        listLookaheadDays = value
        SharedSettings.listLookaheadDays = value
        refreshAfterSettingsChange()
    }

    func setShowAllDay(_ value: Bool) {
        showAllDayEvents = value
        SharedSettings.showAllDayEvents = value
        refreshAfterSettingsChange()
    }

    func setHideDeclined(_ value: Bool) {
        hideDeclinedEvents = value
        SharedSettings.hideDeclinedEvents = value
        refreshAfterSettingsChange()
    }

    func select(eventID: String) {
        guard calendarService.event(withIdentifier: eventID) != nil else {
            errorMessage = CalendarServiceError.eventNotFound.localizedDescription
            return
        }
        selectedEvent = EventSelection(id: eventID)
    }

    func clearError() {
        errorMessage = nil
    }

    func open(url: URL) {
        guard url.scheme == "plans", url.host == "event" else {
            return
        }
        let encodedIdentifier = String(url.path.dropFirst())
        guard let identifier = encodedIdentifier.removingPercentEncoding, !identifier.isEmpty else {
            return
        }
        select(eventID: identifier)
    }

    private func prepareAndReload() async {
        do {
            _ = try calendarService.plansCalendar()
            calendars = calendarService.allEventCalendars()
            if !SharedSettings.calendarSelectionIsConfigured {
                includedCalendarIDs = Set(calendars.map(\.calendarIdentifier))
                SharedSettings.includedCalendarIDs = includedCalendarIDs
            }
            await reload()
            WidgetCenter.shared.reloadAllTimelines()
            BackgroundRefreshController.schedule()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func refreshAfterSettingsChange() {
        Task {
            await reload()
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

private struct ContentView: View {
    @EnvironmentObject private var model: PlansAppModel
    @Environment(\.openURL) private var openURL
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            Group {
                switch model.authorizationStatus {
                case .fullAccess:
                    eventList
                case .notDetermined:
                    permissionView
                default:
                    deniedView
                }
            }
            .navigationTitle("Plans")
            .toolbar {
                if model.authorizationStatus == .fullAccess {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showingSettings = true
                        } label: {
                            Label("Settings", systemImage: "slider.horizontal.3")
                        }
                    }
                }
            }
            .refreshable {
                await model.reload()
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView()
                    .environmentObject(model)
            }
            .sheet(item: $model.selectedEvent) { selection in
                EventDetailView(
                    eventStore: model.calendarService.eventStore,
                    eventIdentifier: selection.id
                )
            }
            .alert(
                "Plans couldn’t complete that action",
                isPresented: Binding(
                    get: { model.errorMessage != nil },
                    set: { isPresented in
                        if !isPresented {
                            model.clearError()
                        }
                    }
                )
            ) {
                Button("OK") {
                    model.clearError()
                }
            } message: {
                Text(model.errorMessage ?? "Unknown error")
            }
        }
    }

    private var permissionView: some View {
        ContentUnavailableView {
            Label("Calendar Access", systemImage: "calendar.badge.checkmark")
        } description: {
            Text(
                "Plans needs Full Access to show your calendars in widgets and save plans you explicitly share."
            )
        } actions: {
            Button("Allow Calendar Access") {
                Task {
                    await model.requestCalendarAccess()
                }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    private var deniedView: some View {
        ContentUnavailableView {
            Label("Calendar Access Is Off", systemImage: "calendar.badge.exclamationmark")
        } description: {
            Text("Allow Full Access in Settings to use Plans.")
        } actions: {
            Button("Open Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    openURL(url)
                }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    @ViewBuilder
    private var eventList: some View {
        if model.events.isEmpty {
            ContentUnavailableView(
                "Nothing scheduled",
                systemImage: "calendar",
                description: Text("Your selected calendars are clear for the next \(model.listLookaheadDays) days.")
            )
        } else {
            List {
                ForEach(sections) { section in
                    Section(section.title) {
                        ForEach(section.items) { item in
                            Button {
                                model.select(eventID: item.id)
                            } label: {
                                PlanListRow(item: item)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
        }
    }

    private var sections: [PlanSection] {
        let calendar = Calendar.autoupdatingCurrent
        let today = model.events.filter { calendar.isDateInToday($0.start) }
        let tomorrow = model.events.filter { calendar.isDateInTomorrow($0.start) }
        let later = model.events.filter {
            !calendar.isDateInToday($0.start) && !calendar.isDateInTomorrow($0.start)
        }

        return [
            PlanSection(title: "Today", items: today),
            PlanSection(title: "Tomorrow", items: tomorrow),
            PlanSection(title: "Later", items: later)
        ]
        .filter { !$0.items.isEmpty }
    }
}

private struct PlanSection: Identifiable {
    let title: String
    let items: [PlanItem]
    var id: String { title }
}

private struct PlanListRow: View {
    let item: PlanItem

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(Color(planHex: item.calendarColorHex))
                .frame(width: 9, height: 9)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 5) {
                    Text(displayTitle)
                        .italic(isUncertain)
                        .font(.body.weight(.medium))
                    if item.source == .text {
                        Text("💬")
                            .font(.caption)
                            .accessibilityLabel("Shared from a message")
                    }
                }

                HStack(spacing: 6) {
                    Text(timeText)
                    if let location = item.location, !location.isEmpty {
                        Text("•")
                        Text(location)
                            .lineLimit(1)
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                Text(item.calendarName)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 3)
        .contentShape(Rectangle())
    }

    private var isUncertain: Bool {
        item.isTentative || (item.confidence ?? 1) < 0.6
    }

    private var displayTitle: String {
        "\(item.title)\(isUncertain ? "?" : "")"
    }

    private var timeText: String {
        if item.isAllDay {
            return "All day"
        }
        return item.start.formatted(date: .omitted, time: .shortened)
    }
}

private struct SettingsView: View {
    @EnvironmentObject private var model: PlansAppModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Calendars in Plans") {
                    ForEach(model.calendars, id: \.calendarIdentifier) { calendar in
                        Toggle(
                            isOn: Binding(
                                get: {
                                    model.includedCalendarIDs.contains(calendar.calendarIdentifier)
                                },
                                set: {
                                    model.setCalendar(calendar.calendarIdentifier, included: $0)
                                }
                            )
                        ) {
                            HStack {
                                Circle()
                                    .fill(Color(uiColor: UIColor(cgColor: calendar.cgColor)))
                                    .frame(width: 10, height: 10)
                                VStack(alignment: .leading) {
                                    Text(calendar.title)
                                    Text(calendar.source.title)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                Section("Lookahead") {
                    Stepper(
                        "Widgets: \(model.widgetLookaheadDays) days",
                        value: Binding(
                            get: { model.widgetLookaheadDays },
                            set: { model.setWidgetLookahead($0) }
                        ),
                        in: 1...7
                    )
                    Stepper(
                        "App list: \(model.listLookaheadDays) days",
                        value: Binding(
                            get: { model.listLookaheadDays },
                            set: { model.setListLookahead($0) }
                        ),
                        in: 1...30
                    )
                }

                Section("Event Filters") {
                    Toggle(
                        "Show all-day events",
                        isOn: Binding(
                            get: { model.showAllDayEvents },
                            set: { model.setShowAllDay($0) }
                        )
                    )
                    Toggle(
                        "Hide declined events",
                        isOn: Binding(
                            get: { model.hideDeclinedEvents },
                            set: { model.setHideDeclined($0) }
                        )
                    )
                }

                Section("Privacy") {
                    Label("Message text is parsed on this device.", systemImage: "lock.shield")
                    Text(
                        "The original message is never saved. Only the event title, time, optional location, and confidence metadata sync to iCloud Calendar."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

private struct EventDetailView: UIViewControllerRepresentable {
    let eventStore: EKEventStore
    let eventIdentifier: String
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator {
        Coordinator {
            dismiss()
        }
    }

    func makeUIViewController(context: Context) -> UINavigationController {
        let detail = EKEventViewController()
        detail.event = eventStore.event(withIdentifier: eventIdentifier)
            ?? eventStore.calendarItem(withIdentifier: eventIdentifier) as? EKEvent
        detail.allowsCalendarPreview = true
        detail.allowsEditing = true
        detail.delegate = context.coordinator
        return UINavigationController(rootViewController: detail)
    }

    func updateUIViewController(_ uiViewController: UINavigationController, context: Context) {}

    final class Coordinator: NSObject, EKEventViewDelegate {
        private let onComplete: () -> Void

        init(onComplete: @escaping () -> Void) {
            self.onComplete = onComplete
        }

        func eventViewController(
            _ controller: EKEventViewController,
            didCompleteWith action: EKEventViewAction
        ) {
            onComplete()
        }
    }
}

private enum BackgroundRefreshController {
    static var identifier: String {
        (Bundle.main.object(forInfoDictionaryKey: "PlansRefreshTaskIdentifier") as? String)
            ?? "com.example.plans.refresh"
    }

    static func register() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: identifier,
            using: nil
        ) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }

            schedule()
            let completion = BackgroundTaskCompletion(task: refreshTask)
            refreshTask.expirationHandler = {
                completion.finish(success: false)
            }
            WidgetCenter.shared.reloadAllTimelines()
            completion.finish(success: true)
        }
    }

    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: identifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }
}

private final class BackgroundTaskCompletion: @unchecked Sendable {
    private let lock = NSLock()
    private let task: BGTask
    private var isFinished = false

    init(task: BGTask) {
        self.task = task
    }

    func finish(success: Bool) {
        lock.lock()
        defer { lock.unlock() }
        guard !isFinished else {
            return
        }
        isFinished = true
        task.setTaskCompleted(success: success)
    }
}

struct AddPlanFromTextIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Plan from Text"
    static var description = IntentDescription(
        "Parses text on-device and adds the resulting plan to the Plans calendar."
    )

    @Parameter(title: "Message Text")
    var text: String

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let service = CalendarService()
        guard service.authorizationStatus == .fullAccess else {
            throw CalendarServiceError.calendarAccessRequired
        }

        let draft = LocalPlanParser().parse(text)
        let result = try service.upsert(plan: draft)
        WidgetCenter.shared.reloadAllTimelines()

        switch result {
        case .duplicate:
            return .result(dialog: "A matching calendar event already exists.")
        default:
            return .result(dialog: "Added \(draft.title) to your Plans calendar.")
        }
    }
}

struct PlansShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddPlanFromTextIntent(),
            phrases: [
                "Add a plan in \(.applicationName)",
                "Save a message plan with \(.applicationName)"
            ],
            shortTitle: "Add Plan",
            systemImageName: "calendar.badge.plus"
        )
    }
}

private extension Color {
    init(planHex: String) {
        let cleaned = planHex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let red = Double((value >> 16) & 0xFF) / 255
        let green = Double((value >> 8) & 0xFF) / 255
        let blue = Double(value & 0xFF) / 255
        self.init(red: red, green: green, blue: blue)
    }
}
