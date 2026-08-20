import { Platform, type TextInputProps } from 'react-native';

/**
 * React Native itself blinds the caret on email fields for one class of device.
 *
 * ReactTextInputManager.setKeyboardType() has this branch:
 *
 *     KEYBOARD_TYPE_EMAIL_ADDRESS -> if (shouldHideCursorForEmailTextInput())
 *                                      view.isCursorVisible = false
 *
 * and shouldHideCursorForEmailTextInput() is true for Xiaomi/Redmi/POCO on
 * Android 10 exactly. It is a workaround for a MIUI crash when the email
 * autofill prompt tries to position itself against the caret
 * (facebook/react-native#27204) - RN chose to hide the cursor rather than let
 * those devices crash.
 *
 * The side effect is that on such a phone EVERY keyboardType="email-address"
 * input looks dead: tapping it opens the keyboard and types fine, but there is
 * no blinking caret, while the password field right below it (no email
 * variation, so no workaround) shows one normally. No amount of cursorColor,
 * caretHidden={false}, or theming in styles.xml can undo it - setCaretHidden()
 * carries the same device guard and bails out early, and the whole thing lives
 * in the prebuilt react-android AAR, so it cannot be patch-package'd either.
 *
 * The only lever left from JS is to not ask for the email variation on those
 * devices. We give up the keyboard's dedicated "@" key there - and only there -
 * to get a visible caret back; autoCorrect/autoCapitalize are pinned off by
 * hand because the email variation was what used to imply them.
 */
const CARET_BREAKS_ON_EMAIL_KEYBOARD =
  Platform.OS === 'android' &&
  Platform.Version === 29 &&
  /xiaomi|redmi|poco/.test(String(Platform.constants?.Manufacturer ?? '').toLowerCase());

/**
 * Spread onto any TextInput that collects an email address, in place of
 * keyboardType/autoCapitalize/autoCorrect:
 *
 *     <TextInput {...emailFieldProps} placeholder="Email Address *" ... />
 */
export const emailFieldProps: Pick<
  TextInputProps,
  'keyboardType' | 'autoCapitalize' | 'autoCorrect'
> = {
  keyboardType: CARET_BREAKS_ON_EMAIL_KEYBOARD ? 'default' : 'email-address',
  autoCapitalize: 'none',
  autoCorrect: false,
};
