import React from "react";
import ReactDOM from "react-dom";
import Mermaid from "react-mermaid2";

import { State } from "./lib/machine";
import { generateMermaid } from "./lib/graph/generate-state-links";

const states: State<any, any, {}>[] = [
  {
    fork: "Completed check",
    requirements: ["notComplete"],
    states: [
      {
        id: "SectionCompleted_appSecurity",
        isDone: ["completedAppSecurity"],
      },
      {
        id: "ChooseBusinessType",
        isDone: ["businessTypeExists"],
      },
      {
        fork: "CompanyTypeFork",
        requirements: ["businessTypeIsOther"],
        states: [{ id: "Other type", isDone: [] }],
      },
      {
        fork: "CompanyTypeFork",
        requirements: ["isLimitedCompany"],
        chartGroup: "Limited company",
        states: [
          {
            id: "BusinessSearch",
            isDone: ["businessNameExists"],
          },
          {
            fork: "companyIneligibilityCheck",
            requirements: ["pscIsOther"],
            states: [
              {
                id: "OnboardingCannotOpenAccountCompanyIneligible",
                isDone: [],
              },
            ],
          },
          {
            fork: "companyIneligibilityCheck",
            requirements: ["pscCompany"],
            states: [
              {
                id: "OnboardingCannotOpenAccountCompanyIneligible",
                isDone: [],
              },
            ],
          },
          {
            fork: "companyIneligibilityCheck",
            requirements: ["noDirector"],
            states: [
              {
                id: "OnboardingCannotOpenAccountCompanyIneligible",
                isDone: [],
              },
            ],
          },
          {
            fork: "companyIneligibilityCheck",
            requirements: ["noPsc"],
            states: [
              {
                id: "OnboardingCannotOpenAccountCompanyIneligible",
                isDone: [],
              },
            ],
          },
          {
            fork: "companyIneligibilityCheck",
            requirements: ["pscCount"],
            states: [
              {
                id: "OnboardingCannotOpenAccountCompanyIneligible",
                isDone: [],
              },
            ],
          },
          {
            fork: "companyIneligibilityCheck",
            requirements: ["companyNotFound"],
            states: [
              {
                id: "OnboardingCannotOpenAccountCompanyIneligible",
                isDone: [],
              },
            ],
          },
          {
            fork: "ConfirmBusinessSelectionFork",
            requirements: ["companySearched"],
            states: [
              {
                id: "ConfirmBusinessSelection",
                isDone: ["businessSelectionConfirmed"],
              },
            ],
          },
          {
            fork: "pscIneligibilityCheck",
            requirements: ["nonGbResident"],
            states: [
              { id: "OnboardingCannotOpenAccountPscIneligible", isDone: [] },
            ],
          },
          {
            fork: "pscIneligibilityCheck",
            requirements: ["notDirector"],
            states: [
              { id: "OnboardingCannotOpenAccountPscIneligible", isDone: [] },
            ],
          },
          {
            fork: "pscIneligibilityCheck",
            requirements: ["notMe"],
            states: [
              { id: "OnboardingCannotOpenAccountPscIneligible", isDone: [] },
            ],
          },
          {
            fork: "HasBusinessAddressFork",
            requirements: ["noBusinessAddress"],
            states: [
              { id: "BusinessAddressSearch", isDone: ["hasBusinessAddress"] },
            ],
          },
          {
            fork: "BusinessAddressFork",
            requirements: ["hasBusinessAddress"],
            states: [
              { id: "BusinessAddressEnter", isDone: ["hasBusinessAddress"] },
            ],
          },
          {
            fork: "applicantExactMatchCheck",
            requirements: ["applicantNotExactMatch"],
            states: [{ id: "ConfirmName", isDone: ["nameConfirmed"] }],
          },
          {
            id: "Terms",
            isDone: ["termsDone"],
          },
          {
            id: "SICCodeConfirmation",
            isDone: ["confirmedSICCode"],
          },
          {
            fork: "IsSICCodeConfirmed",
            requirements: ["SicCodeNotConfirmed"],
            states: [{ id: "SICCodeUpdate", isDone: [] }],
          },
          {
            id: "BusinessDescription",
            isDone: ["hasBusinessDescription"],
          },
          {
            id: "StLimitedBusinessUrl",
            isDone: ["hasBusinessUrl"],
          },
          {
            id: "SectionCompleted_aboutYourBusiness",
            isDone: ["hasSeenSectionCompletedAboutYourBusiness"],
          },
          {
            id: "SelectInitialFundsSource",
            isDone: ["hasEnteredInitialFundsSource"],
          },
          {
            id: "FirstDepositAmount",
            isDone: ["hasEnteredFirstDepositAmount"],
          },
          {
            id: "AnnualTurnover",
            isDone: ["hasEnteredAnnualTurnover"],
          },
          {
            id: "WillReceiveCashPayments",
            isDone: ["hasEnteredWillReceiveCashPayments"],
          },
          {
            fork: "CashPaymentPercentageFork",
            requirements: ["enteredPercentageCashPayments"],
            states: [
              {
                id: "CashPaymentPercentage",
                isDone: ["hasEnteredCashPaymentPercentage"],
              },
            ],
          },
          {
            id: "SectionCompleted_businessFinances",
            isDone: ["hasSeenSectionCompletedBusinessFinances"],
          },
          {
            id: "ConfirmDateOfBirth",
            isDone: ["hasConfirmedDateOfBirth"],
          },
          { id: "HomeAddressSearch", isDone: ["hasSearchedForHomeAddress"] },
          {
            fork: "HomeAddressFork",
            requirements: ["needsToEnterHomeAddress"],
            states: [
              { id: "HomeAddressEnter", isDone: ["hasEnteredHomeAddress"] },
            ],
          },
        ],
      },
      {
        fork: "CompanyTypeFork",
        requirements: ["isSoleTrader"],
        chartGroup: "Sole trader",
        states: [
          { id: "StTerms", isDone: ["termsAccepted"] },
          { id: "StTradingName", isDone: ["hasEnteredTradingName"] },
          {
            id: "StTradingAddressSearch",
            isDone: ["hasEnteredTradingAddress"],
          },
          {
            fork: "StTradingAddressFork",
            requirements: ["enteringAddressManually"],
            states: [
              {
                id: "StTradingAddressEnter",
                isDone: ["hasEnteredTradingAddress"],
              },
            ],
          },
          {
            id: "StEnterSector",
            isDone: ["hasEnteredSector"],
          },
          {
            id: "StBusinessDescription",
            isDone: ["hasEnteredBusinessDescription"],
          },
          {
            id: "StBusinessUrl",
            isDone: ["hasEnteredBusinessUrl"],
          },
          {
            fork: "NoOnlinePresenceFork",
            requirements: ["hasNoOnlinePresence"],
            states: [
              {
                id: "StBusinessDocument",
                isDone: ["hasUploadedBusinessDocument"],
              },
              {
                fork: "BusinessDocumentUploadedFork",
                requirements: ["hasNotUploadedADocument"],
                states: [
                  {
                    id: "StBusinessDocumentCamera",
                    isDone: ["hasUploadedBusinessDocument"],
                  },
                  {
                    id: "StBusinessDocumentUpload",
                    isDone: ["hasUploadedBusinessDocument"],
                  },
                ],
              },
              {
                fork: "BusinessDocumentSkippedFork",
                requirements: ["hasSkippedBusinessDocument"],
                states: [
                  {
                    id: "StBusinessDocumentSkip",
                    isDone: ["hasConfirmedSkipBusinessDocument"],
                  },
                ],
              },
            ],
          },
          {
            id: "StSectionCompleted_aboutYourBusiness",
            isDone: ["hasSeenSectionCompletedAboutYourBusiness"],
          },
          {
            id: "StSelectInitialFundsSource",
            isDone: ["hasEnteredInitialFundsSource"],
          },
          {
            id: "StFirstDepositAmount",
            isDone: ["hasEnteredFirstDepositAmount"],
          },
          {
            id: "StAnnualTurnover",
            isDone: ["hasEnteredAnnualTurnover"],
          },
          {
            id: "StWillReceiveCashPayments",
            isDone: ["hasEnteredWillReceiveCashPayments"],
          },
          {
            fork: "StCashPaymentsPercentageFork",
            requirements: ["willReceiveCashPayments"],
            states: [
              {
                id: "StCashPaymentPercentage",
                isDone: ["hasEnteredCashPaymentPercentage"],
              },
            ],
          },
          {
            id: "StSectionCompleted_businessFinances",
            isDone: ["hasSeenSectionCompletedBusinessFinances"],
          },
          {
            id: "StEnterName",
            isDone: ["hasEnteredName"],
          },
          {
            id: "StEnterDateOfBirth",
            isDone: ["hasEnteredDateOfBirth"],
          },
          {
            id: "StHomeAddressSearch",
            isDone: ["hasEnteredHomeAddress"],
          },
          {
            fork: "StHomeAddressFork",
            requirements: ["isEnteringStHomeAddressManually"],
            states: [
              { id: "StHomeAddressEnter", isDone: ["hasEnteredHomeAddress"] },
            ],
          },
        ],
      },
      {
        id: "AntiImpersonationIntro",
        isDone: ["hasSeenAntiImpersonationIntro"],
      },
      {
        id: "AntiImpersonationCitizenshipSelection",
        isDone: ["hasEnteredAntiImpersonationCitizenship"],
      },
      {
        fork: "AntiImpersonationDocumentSelectionFork",
        requirements: ["isROW"],
        states: [{ id: "AntiImpersonationDocumentSelectionROW", isDone: [] }],
      },
      {
        fork: "AntiImpersonationDocumentSelectionFork",
        requirements: ["isEU_EEA"],
        states: [{ id: "AntiImpersonationDocumentSelectionEU", isDone: [] }],
      },
      {
        fork: "AntiImpersonationDocumentSelectionFork",
        requirements: ["isUK"],
        states: [{ id: "AntiImpersonationDocumentSelectionUK", isDone: [] }],
      },
      {
        id: "AntiImpersonation",
        isDone: ["hasEnteredAntiImpersonation"],
      },
      {
        fork: "hasMultiplePscs2",
        requirements: ["hasMultiplePscs"],
        states: [
          {
            id: "MboIntro",
            isDone: ["hasSeenMboIntro"],
          },
          {
            fork: "MboExactMatchCheck",
            requirements: ["mboIsNotExactMatch"],
            states: [{ id: "MboConfirmName", isDone: ["hasConfirmedMboName"] }],
          },
          {
            id: "MboConfirmDateOfBirth",
            isDone: ["hasEnteredMboDateOfBirth"],
          },
          {
            id: "MbHomeAddressSearch",
            isDone: ["hasEnteredHomeAddressPostcode"],
          },
          {
            fork: "MboHomeAddressFork",
            requirements: ["enteringMboHomeAddressManually"],
            states: [
              {
                id: "MboHomeAddressEnter",
                isDone: ["hasEnteredHomeAddress"],
              },
            ],
          },
        ],
      },
      {
        fork: "IsBusinessNameLimited",
        requirements: ["businessNameIsLimited"],
        states: [
          {
            id: "ChooseCardBusinessName",
            isDone: ["hasChosenCardBusinessName"],
          },
        ],
      },
      {
        fork: "IsPersonalNameLimited",
        requirements: ["personalNameIsLimited"],
        states: [
          {
            id: "ChooseCardPersonalName",
            isDone: ["hasChosenCardPersonalName"],
          },
        ],
      },
      {
        id: "SectionCompleted_confirmIdentity",
        isDone: ["hasSeenSectionCompleted_confirmIdentity"],
      },
      {
        fork: "IneligibilityCheckCatchAll",
        requirements: ["isIneligible"],
        states: [{ id: "OnboardingCannotOpenAccountIneligible", isDone: [] }],
      },
    ],
  },
  {
    fork: "Completed check",
    requirements: ["complete"],
    states: [
      {
        id: "Holding",
        isDone: [],
      },
    ],
  },
];

const rendered = generateMermaid(states);
// const rendered = process(simpleStates);

const App = () => {
  console.log(rendered.split("\n"));
  return (
    <>
      <Mermaid chart={rendered} />
      <style>
        {`html, body {background: black;}
        svg {
        height: auto !important;
      }`}
      </style>
    </>
  );
};

const elm = document.createElement("div");
document.body.appendChild(elm);
ReactDOM.render(<App />, elm);
