import Foundation
import PlansShared
import XCTest

final class PlansSharedTests: XCTestCase {
    private var calendar: Calendar!

    override func setUp() {
        super.setUp()
        calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale(identifier: "en_US_POSIX")
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
    }

    func testDinnerDefaultsToTwoHoursAndExtractsContact() {
        let now = date(year: 2026, month: 9, day: 9, hour: 12)
        let parser = LocalPlanParser(
            calendar: calendar,
            locale: Locale(identifier: "en_US_POSIX")
        )

        let plan = parser.parse("Dinner with Sam tomorrow at 7pm?", now: now)

        XCTAssertEqual(plan.title, "Dinner with Sam")
        XCTAssertEqual(plan.contactName, "Sam")
        XCTAssertTrue(plan.detectedDate)
        XCTAssertEqual(plan.end.timeIntervalSince(plan.start), 2 * 60 * 60, accuracy: 1)
        XCTAssertGreaterThanOrEqual(plan.confidence, 0.8)
    }

    func testTentativePlanIsMarkedAndUsesEditableFallbackDate() {
        let now = date(year: 2026, month: 9, day: 9, hour: 12, minute: 25)
        let parser = LocalPlanParser(calendar: calendar)

        let plan = parser.parse("Maybe coffee with Alex", now: now)

        XCTAssertEqual(plan.title, "Coffee with Alex")
        XCTAssertTrue(plan.isTentative)
        XCTAssertFalse(plan.detectedDate)
        XCTAssertEqual(plan.confidence, 0.3, accuracy: 0.001)
        XCTAssertEqual(calendar.component(.minute, from: plan.start), 0)
        XCTAssertEqual(plan.end.timeIntervalSince(plan.start), 60 * 60, accuracy: 1)
    }

    func testMetadataContainsNoMessageEvidence() throws {
        let originalMessage = "This private sentence must not persist"
        let metadata = PlanEventMetadata(
            key: "manual-123",
            confidence: 0.9,
            tentative: false,
            contact: "Sam"
        )

        let encoded = try XCTUnwrap(CalendarService.encodeMetadata(metadata))

        XCTAssertFalse(encoded.contains(originalMessage))
        XCTAssertFalse(encoded.lowercased().contains("evidence"))
        XCTAssertEqual(CalendarService.decodeMetadata(from: encoded), metadata)
    }

    func testAllDayPlanEndsOnFollowingDay() {
        let now = date(year: 2026, month: 9, day: 9, hour: 12)
        let parser = LocalPlanParser(calendar: calendar)

        let plan = parser.parse("Hiking with Alex tomorrow", now: now)

        XCTAssertTrue(plan.detectedDate)
        XCTAssertTrue(plan.isAllDay)
        XCTAssertEqual(plan.end.timeIntervalSince(plan.start), 24 * 60 * 60, accuracy: 1)
    }

    private func date(
        year: Int,
        month: Int,
        day: Int,
        hour: Int,
        minute: Int = 0
    ) -> Date {
        calendar.date(
            from: DateComponents(
                timeZone: calendar.timeZone,
                year: year,
                month: month,
                day: day,
                hour: hour,
                minute: minute
            )
        )!
    }
}
