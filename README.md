# Workout Timer (Scriptable widget)

A rest timer widget for iOS, built with [Scriptable](https://scriptable.app). Tap it after each set to start your rest countdown.

## Features
- **Tap the widget after a set:** the rest countdown starts, the set counter goes up, and you get a notification with sound when rest is over.
- **Three states:** gray means idle, orange means resting (live countdown), and green means "GO! Set N" (it also shows how long you've gone past your rest time).
- **Workout duration** shows on medium and large widgets.
- **Lock Screen widgets** are supported too (circular and rectangular).
- **New workouts start on their own:** if you don't tap for 90 minutes, the set count resets.

## Setup
1. Install **Scriptable** from the App Store.
2. In Scriptable, tap **+**, paste the contents of `WorkoutTimer.js`, and name the script **WorkoutTimer**.
3. Run it once in the app and allow notifications.
4. Add a Scriptable widget to your home screen. Long-press it, choose **Edit Widget**, and set:
   - **Script:** WorkoutTimer
   - **When Interacting:** *Run Script*
   - **Parameter:** your rest length in seconds, e.g. `90` or `120` (optional, default 90)

## Using it
- **Finish a set, then tap the widget.** Scriptable opens briefly, starts the timer, and goes back to the home screen.
- **Run the script in the Scriptable app** for a menu where you can pick a different rest length (60s, 90s, 2 min, 3 min), undo the last set, or reset the workout.

## Notes and limits
- Scriptable can't run code from a widget without opening the app (it has no iOS interactive-widget buttons), so each tap opens Scriptable for a moment.
- The countdown is a native iOS timer label, so it ticks every second. iOS decides when the widget redraws, though. After a tap, the widget can take a few seconds to switch to the orange state, and the switch to green can lag a little behind the end of your rest. The **notification** is always on time.
- You can change the defaults in the `Settings` block at the top of the script.
