import { State } from "@josephluck/machi/src/machine";
export const states: State<any, any, {}>[] = [
  {
    id: "Splash",

    isDone: [
      function hasChosenSignUpOrSignIn(context) {
        return context.authenticationFlow !== "splash";
      },
    ],
  },
  {
    fork: "Needs to authenticate?",
    requirements: [
      function needsToAuthenticate(context) {
        return !context.isAuthenticated;
      },
    ],
    states: [
      {
        fork: "Which auth type has been chosen?",
        requirements: [
          function phoneAuth(context) {
            return context.authType === "phone";
          },
        ],
        states: [
          {
            id: "Enter phone number",

            isDone: [
              function phoneNumberEntered(context) {
                return !!context.phoneNumber;
              },
              function otpSent(context) {
                return !!context.verificationId;
              },
            ],
          },
          {
            id: "Verify phone number using OTP",

            isDone: [
              function verificationCodeEntered(context) {
                return !!context.verificationCode;
              },
            ],
          },
        ],
      },
      {
        fork: "Which auth type has been chosen?",
        requirements: [
          function emailAuth(context) {
            return context.authType === "email";
          },
        ],
        states: [
          {
            id: "Enter email address",

            isDone: [
              function hasProvidedEmail(context) {
                return !!context.emailAddress;
              },
            ],
          },
          {
            id: "Enter password",

            isDone: [
              function hasProvidedOrResetPassword(context) {
                return !!context.password || context.hasResetPassword;
              },
            ],
          },
          {
            fork: "Has reset password",
            requirements: [
              function hasResetPassword(context) {
                return context.hasResetPassword;
              },
            ],
            states: [
              {
                id: "Reset password instructions",

                isDone: [
                  function hasSeenResetPasswordInstructions(context) {
                    return context.hasSeenResetPasswordInstructions;
                  },
                ],
              },
              {
                id: "Reset password enter new password",

                isDone: [
                  function hasProvidedPassword(context) {
                    return !!context.password;
                  },
                  function hasSuccessfullyResetPassword(context) {
                    return context.isAuthenticated;
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "Enter name",

    isDone: [
      function hasProvidedName(context) {
        return !!context.name;
      },
    ],
  },
  // {
  //   id: "Capture avatar",
  //
  //   isDone: [
  //     function hasProvidedOrSkippedAvatar(context) {
  //       return !!context.avatar || context.skipAvatar;
  //     },
  //   ],
  // },
];
