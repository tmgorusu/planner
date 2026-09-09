import EventKit
import PlansShared
import SwiftUI
import UniformTypeIdentifiers
import UIKit
import WidgetKit

final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let model = SharePlanViewModel(
            inputItems: extensionContext?.inputItems as? [NSExtensionItem] ?? [],
            complete: { [weak self] in
                self?.extensionContext?.completeRequest(returningItems: nil)
            },
            cancel: { [weak self] in
                self?.extensionContext?.cancelRequest(
                    withError: NSError(
                        domain: "PlansShareExtension",
                        code: NSUserCancelledError
                    )
                )
            }
        )
        let hostingController = UIHostingController(
            rootView: SharePlanView(model: model)
        )

        addChild(hostingController)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hostingController.view)
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        hostingController.didMove(toParent: self)
    }
}

@MainActor
final class SharePlanViewModel: ObservableObject {
    enum LoadState: Equatable {
        case loading
        case ready
        case failed(String)
        case saving
    }

    @Published var state: LoadState = .loading
    @Published var title = ""
    @Published var start = Date()
    @Published var end = Date(timeIntervalSinceNow: 60 * 60)
    @Published var isAllDay = false
    @Published var location = ""
    @Published var isTentative = false
    @Published private(set) var confidence = 0.0
    @Published private(set) var detectedDate = false

    private let inputItems: [NSExtensionItem]
    private let complete: () -> Void
    private let cancel: () -> Void
    private var draftKey = UUID().uuidString.lowercased()
    private var contactName: String?
    private var hasLoaded = false

    init(
        inputItems: [NSExtensionItem],
        complete: @escaping () -> Void,
        cancel: @escaping () -> Void
    ) {
        self.inputItems = inputItems
        self.complete = complete
        self.cancel = cancel
    }

    func load() {
        guard !hasLoaded else {
            return
        }
        hasLoaded = true

        let providers = inputItems.compactMap(\.attachments).flatMap { $0 }
        guard let provider = providers.first(where: {
            $0.hasItemConformingToTypeIdentifier(UTType.text.identifier)
                || $0.hasItemConformingToTypeIdentifier(UTType.url.identifier)
        }) else {
            state = .failed("Share a message or other plain text with Plans.")
            return
        }

        let type = provider.hasItemConformingToTypeIdentifier(UTType.text.identifier)
            ? UTType.text.identifier
            : UTType.url.identifier

        provider.loadItem(forTypeIdentifier: type, options: nil) { [weak self] item, error in
            Task { @MainActor in
                guard let self else {
                    return
                }
                if let error {
                    self.state = .failed(error.localizedDescription)
                    return
                }

                let text: String?
                switch item {
                case let string as String:
                    text = string
                case let string as NSString:
                    text = string as String
                case let url as URL:
                    text = url.absoluteString
                case let data as Data:
                    text = String(data: data, encoding: .utf8)
                default:
                    text = nil
                }

                guard let text, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    self.state = .failed("Plans couldn’t read the shared text.")
                    return
                }
                self.apply(LocalPlanParser().parse(text))
            }
        }
    }

    func save() {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else {
            state = .failed("Enter a title for this plan.")
            return
        }
        guard end > start else {
            state = .failed("The end must be later than the start.")
            return
        }

        state = .saving
        let plan = PlanDraft(
            key: draftKey,
            title: cleanTitle,
            start: start,
            end: end,
            isAllDay: isAllDay,
            location: location.trimmingCharacters(in: .whitespacesAndNewlines),
            confidence: confidence,
            contactName: contactName,
            isTentative: isTentative,
            detectedDate: detectedDate
        )

        do {
            let service = CalendarService()
            guard service.authorizationStatus == .fullAccess else {
                throw CalendarServiceError.calendarAccessRequired
            }
            let result = try service.upsert(plan: plan)
            if case .duplicate = result {
                state = .failed("A matching event already exists in another calendar.")
                return
            }
            WidgetCenter.shared.reloadAllTimelines()
            complete()
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func cancelSharing() {
        cancel()
    }

    func returnToEditor() {
        if case .failed = state {
            state = title.isEmpty ? .loading : .ready
        }
    }

    private func apply(_ draft: PlanDraft) {
        draftKey = draft.key
        title = draft.title
        start = draft.start
        end = draft.end
        isAllDay = draft.isAllDay
        location = draft.location ?? ""
        isTentative = draft.isTentative
        confidence = draft.confidence
        contactName = draft.contactName
        detectedDate = draft.detectedDate
        state = .ready
    }
}

private struct SharePlanView: View {
    @ObservedObject var model: SharePlanViewModel

    var body: some View {
        NavigationStack {
            Group {
                switch model.state {
                case .loading:
                    ProgressView("Reading shared text…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                case .ready:
                    editor
                case let .failed(message):
                    failure(message)
                case .saving:
                    ProgressView("Saving to Calendar…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("Add to Plans")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        model.cancelSharing()
                    }
                }
                if model.state == .ready {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Add") {
                            model.save()
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
        }
        .task {
            model.load()
        }
    }

    private var editor: some View {
        Form {
            if !model.detectedDate {
                Section {
                    Label(
                        "No date was detected. Check the suggested time before adding.",
                        systemImage: "exclamationmark.triangle.fill"
                    )
                    .foregroundStyle(.orange)
                }
            }

            Section("Plan") {
                TextField("Title", text: $model.title)
                TextField("Location (optional)", text: $model.location)
                Toggle("Tentative", isOn: $model.isTentative)
            }

            Section("When") {
                Toggle("All-day", isOn: $model.isAllDay)
                DatePicker(
                    "Starts",
                    selection: $model.start,
                    displayedComponents: model.isAllDay ? [.date] : [.date, .hourAndMinute]
                )
                DatePicker(
                    "Ends",
                    selection: $model.end,
                    in: model.start...,
                    displayedComponents: model.isAllDay ? [.date] : [.date, .hourAndMinute]
                )
            }

            Section("Privacy") {
                Label("Parsed entirely on this device", systemImage: "lock.shield")
                Text("The shared message itself will not be saved.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func failure(_ message: String) -> some View {
        ContentUnavailableView {
            Label("Couldn’t Add Plan", systemImage: "exclamationmark.triangle")
        } description: {
            Text(message)
        } actions: {
            if !model.title.isEmpty {
                Button("Back to Plan") {
                    model.returnToEditor()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}
