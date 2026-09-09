# Plans

Plans is a private iPhone calendar app and widget for:

- Upcoming events from selected iOS calendars.
- Plans manually shared from Messages or any other app.
- On-device date parsing with an editable confirmation sheet.

The app never reads the Messages database—iOS does not expose that access—and
does not send shared text to a server. Only the confirmed calendar event and
minimal confidence metadata are stored. The original message is not persisted.

## Requirements

- Xcode 15.4 or newer.
- iOS 17 or newer.
- An iCloud calendar account enabled under iOS Calendar settings.
- An Apple Developer team that supports App Groups.

## Configure and install

1. Open `Plans.xcodeproj` in Xcode.
2. Edit `Configuration/Base.xcconfig`:
   - Change `PLANS_BUNDLE_PREFIX` to a reverse-domain identifier you own.
   - Change `PLANS_APP_GROUP` to a unique App Group identifier.
   - Change `PLANS_REFRESH_TASK` to match your bundle prefix.
3. Select the **Plans** project, then select your development team for all five
   targets. Keep automatic signing enabled.
4. Confirm the same App Group is enabled for the Plans app, widget, and share
   extension targets.
5. Connect your iPhone, choose it as the run destination, and run the **Plans**
   scheme.
6. On first launch, tap **Allow Calendar Access** and choose **Full Access**.

The app creates a teal iCloud calendar called **Plans (Texts)**. Calendar event
content syncs through iCloud, but the source message does not.

## Use

### Widgets

Add Plans from the Home Screen or Lock Screen widget gallery. The widget offers
small, medium, large, inline, circular, and rectangular families. Open the app
to select calendars and change lookahead/filter settings.

### Share a message

1. Share selected text from Messages.
2. Choose **Plans** in the share sheet.
3. Review the locally parsed title, date, time, and location.
4. Tap **Add**.

If Plans is not visible, use **More** in the share sheet and enable it.

### Shortcut

The **Add Plan from Text** App Intent is available in Shortcuts. It parses the
provided text locally and creates an event. The Share Extension is preferable
when you want to edit the parsed result before saving.

## Permissions

The only runtime privacy permission is **Calendars: Full Access**. Background
App Refresh is optional. Plans does not request Messages, Contacts, Photos,
location, microphone, or network access.

App Groups and Background Modes are signing capabilities, not runtime privacy
prompts. Free Personal Team provisioning may not support App Groups; use a paid
developer team if Xcode cannot create the provisioning profile.

## Development

The project contains:

```text
PlansApp/                 SwiftUI app, settings, EventKit list, App Intent
PlansWidgetExtension/     Home Screen and Lock Screen widgets
PlansShareExtension/      Share sheet confirmation flow
PlansShared/              Static Swift framework: model, calendar service, parser
PlansTests/               Parser and privacy-focused unit tests
```

Run tests from Xcode with **Product → Test**. The checked-in project can be
regenerated deterministically with:

```sh
python3 scripts/generate_project.py
```

## Platform limitations

- iOS cannot automatically scan iMessage or SMS. Without a Mac companion or
  another user-controlled bridge, sharing text is necessarily manual.
- Widget refresh scheduling is controlled by iOS. Timeline entries are
  precomputed at event starts/ends and every 15 minutes for the next six hours,
  but the OS does not guarantee refresh within one minute of every remote
  calendar change.
- The deterministic local parser is more private but less capable than a cloud
  language model. Always review the confirmation sheet.