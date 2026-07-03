# SafeHer

SafeHer is a personal safety companion for women. It is designed around one promise:

> If something goes wrong, SafeHer knows what to do and you know what to press.

The app is not a toolbox of emergency features. It is a single safety journey: prepare guardians, start protected travel, trigger SOS, share location, preserve evidence and recover calmly.

## Product Experience

SafeHer is organized around three moments:

- Normal day: show protection status, guardians, location readiness and one recommended next action.
- Travel: start Safe Journey, monitor ETA, check in, and alert guardians if the journey becomes overdue.
- Emergency: make SOS unmistakable, then automatically coordinate alerts, live location, evidence and recovery.

Primary navigation:

- Home: protection status and SOS.
- Journey: planned travel and journey history.
- Guardians: trusted people who receive alerts.
- Profile: safety ID, privacy and account.

Secondary tools such as fake call, nearby help, evidence vault, incident reporting, hidden camera checks and self defense are intentionally one level deeper so they do not compete with SOS.

## Trust Model

SafeHer asks for sensitive access only when there is a clear protection reason:

| Permission | Why SafeHer needs it |
| --- | --- |
| Location | Share position during SOS and Safe Journey. |
| Notifications | Remind the user to check in and show emergency status. |
| Microphone | Optional audio evidence and sound-triggered SOS. |
| Camera | Optional evidence capture and hidden-camera checks. |
| SMS/Call | Offline alerts and direct emergency calls where supported. |
| Biometrics | Protect profile, guardians and evidence vault. |

The onboarding flow explains permissions before prompting, connects a guardian, rehearses SOS without sending alerts, and ends with: "You are now protected."

## Tech Stack

- React Native 0.81
- Expo SDK 54
- TypeScript
- Firebase
- React Navigation 7
- AsyncStorage and secure local services
- Expo Location, Notifications, AV, Camera, Haptics and Sensors

## Getting Started

```bash
npm install
npm start
```

Run on Android:

```bash
npm run android
```

Run type checks:

```bash
npm run typecheck
```

## Product Direction

The next product milestone is not "more features." It is trust and clarity:

1. Make SafeHer branding consistent everywhere users see it.
2. Keep the home screen emergency-first and context-aware.
3. Move noncritical features behind the primary journey.
4. Strengthen permission education and privacy controls.
5. Add retention loops only after the core safety journey feels reliable.

Full product teardown, design system, IA, roadmap, growth plan and engineering plan live in:

```text
docs/SAFEHER_PRODUCT_REDESIGN_BLUEPRINT.md
```

## Safety Disclaimer

SafeHer is a supplementary safety tool. It cannot guarantee message delivery, police response, network availability or physical safety. In a life-threatening situation, users should contact local emergency services directly whenever possible.
