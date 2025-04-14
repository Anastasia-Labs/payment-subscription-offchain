#let image-background = image("/docs/images/background-1.jpg", height: 100%, fit: "cover")
#let image-foreground = image("/docs/images/Logo-Anastasia-Labs-V-Color02.png", width: 100%, fit: "contain")
#let image-header = image("/docs/images/Logo-Anastasia-Labs-V-Color01.png", height: 75%, fit: "contain")
#let fund-link = link("https://projectcatalyst.io/funds/11/cardano-use-cases-product/anastasia-labs-x-maestro-plug-n-play-20")[Catalyst Proposal]
#let git-link = link(" https://github.com/Anastasia-Labs/payment-subscription")[Payment Subscription Github Repo]
#let maestro_link = link("https://docs.gomaestro.org/getting-started")[Maestro Getting Started]
#let design_docs_link = link("https://github.com/Anastasia-Labs/payment-subscription/blob/main/docs/payment-subscription-design-specs/subscription-smart-contract.pdf")[Design Specification Documentation]


#set page(
  background: image-background,
  paper :"a4",
  margin: (left : 20mm,right : 20mm,top : 40mm,bottom : 30mm)
)

// Set default text style
#set text(15pt, font: "Montserrat")

#v(3cm) // Add vertical space

#align(center)[
  #box(
    width: 60%,
    stroke: none,
    image-foreground,
  )
]

#v(1cm) // Add vertical space

// Set text style for the report title
#set text(22pt, fill: white)

// Center-align the report title
#align(center)[#strong[HOW TO USE]]
#set text(20pt, fill: white)
#align(center)[Payment Subscription Smart Contract]

#v(5cm)

// Set text style for project details
#set text(13pt, fill: white)

// Display project details
#table(
  columns: 2,
  stroke: none,
  [*Project Number*],
  [1100025],
  [*Project Manager*],
  [Jonathan Rodriguez],
  [*Project Name:*], 
  [Anastasia Labs X Maestro - Plug ‘n Play 2.0],
  [*URL:*], 
  [#fund-link]

)

// Reset text style to default
#set text(fill: luma(0%))

// Display project details
#show link: underline
#set terms(separator:[: ],hanging-indent: 18mm)

#set par(justify: true)
#set page(
  paper: "a4",
  margin: (left: 20mm, right: 20mm, top: 40mm, bottom: 35mm),
  background: none,
  header: [
    #align(right)[
      #image("/docs/images/Logo-Anastasia-Labs-V-Color01.png", width: 25%, fit: "contain")
    ]
    #v(-0.5cm)
    #line(length: 100%, stroke: 0.5pt)
  ],
)

#v(20mm)
#show link: underline
#show outline.entry.where(level: 1): it => {
  v(6mm, weak: true)
  strong(it)
}

#outline(depth:3, indent: 1em)
#pagebreak()
#set text(size: 11pt)  // Reset text size to 10pt
#set page(
   footer: [
    #line(length: 100%, stroke: 0.5pt)
    #v(-3mm)
    #align(center)[ 
      #set text(size: 11pt, fill: black)
      *Anastasia Labs – *
      #set text(size: 11pt, fill: gray)
      *Payment Subscription Smart Contract*
      #v(-3mm)
      How To Use - Milestone 3
      #v(-3mm)
    ]
    #v(-6mm)
    #align(right)[
      #context counter(page).display( "1/1",both: true)]
  ] 
)

// Initialize page counter
#counter(page).update(1)
#v(50pt)
// Display project details
#set terms(separator:[: ],hanging-indent: 18mm)
#align(center)[
  #set text(size: 20pt)
  #strong[How to Use the Payment Subscription Smart Contract via Maestro
]]
#v(50pt)
\

#set heading(numbering: "1.")
#show heading: set text(rgb("#c41112"))

= Introduction
\

The Payment Subscription smart contract is designed to manage recurring payments on the Cardano blockchain. It automates subscriber-to-merchant interactions such as service creation, account registration, subscription initiation, extension, cancellation, and fund withdrawals. This guide assists developers in integrating these functions into their applications via Maestro's API endpoints.


\
*Key features include:*


  - Initiating subscriptions with customizable terms

  - Extending or terminating subscriptions
  - Automated recurring payments
  - Secure withdrawal of funds for both merchants and subscribers
  - Seamless integration with popular wallet applications and RESTful API endpoints

#pagebreak()
#v(50pt)

= Prerequisites
\
Before you begin, ensure that you have:

\
  - *Access Credentials:*

    - Maestro API Key (Get from *#maestro_link*)

    - Cardano wallet address with sufficient funds for either the merchant or subscriber

  - *Environment Setup:* 

    - Basic familiarity with REST APIs and JSON data formats.

    - A command-line environment with curl installed.

#pagebreak()
#v(50pt)

= Smart Contract Overview
\
The Payment Subscription smart contract is built using Aiken and comprises three key components:


\
+ *Service Contract:* 

  Responsible for creating a service by minting a CIP-68 compliant Service NFT, managing service metadata, and handling service deactivation.

+ *Account Contract:* 

  Handles the creation of subscriber accounts via minting a CIP-68 compliant Account NFT, updating subscriber metadata, and account removal.

+  *Payment Contract:*

  Manages the locking of prepaid subscription fees, subscription initiation, extension, unsubscription, and fund withdrawals. A linear vesting mechanism gradually releases funds to merchants as per the subscription schedule.
  
  \
Each function is accompanied by detailed onchain and offchain documentation. This guide focuses on how each API endpoint maps to these smart contract functionalities.

#pagebreak()
#v(50pt)

= Merchant Operations

\
Merchant operations primarily include creating a new service and withdrawing subscription fees. These actions allow merchants to configure their service offerings and claim funds that accumulate from subscriber payments.

\
== Create a Service
\
This endpoint registers a new service by minting a Service NFT along with its reference NFT. It captures essential parameters such as service fee, penalty fee, subscription interval, and service status.

\
*Endpoint:*

\
```sh
  POST https://mainnet.gomaestro-api.org/v1/contracts/subscription/createService

```

\
*Required Parameters:*

\
  - *`merchant_address`*: Address of the merchant.

  - *`selected_out_ref`*: UTxO *`tx_hash`* and *`output_index`* used to derive token names.
  - *`service_fee_policyid`*: Policy ID governing the service fee asset. 
  - *`service_fee_assetname`*: Asset name for the service fee. 
  - *`service_fee`*: Fee amount for the service.
  - *`penalty_fee_policyid`*: Policy ID for the penalty fee asset.
  - *`penalty_fee_assetname`*: Asset name for the penalty fee.
  - *`penalty_fee`*: Penalty fee amount (for early cancellations).
  - *`interval_length`*: Duration of one subscription interval (in milliseconds).
  - *`num_intervals`*: Total number of intervals in the subscription period
  - *`is_active`*: Boolean flag indicating the service’s active state.

#pagebreak()

\
*cURL Example:*

\
```sh
# subscription: create service
curl --location 'https://mainnet.gomaestro-api.org/v1/contracts/subscription/createService' \
--header 'Content-Type: application/json' \
--header 'api-key: ${API_KEY}' \
--data '{
    "merchant_address": "addr1qxccwptmx6r523vxcrplvfhtrpdut8s0hht0fyt9f8vy8385chtg2dupkyqu7pgqawju7awrwfg94skstmaves6hwaks6qlgf4",
    "selected_out_ref": {
        "tx_hash": "f68f85ee40866144f52d8087414cfb11ec22539b3772882440bf0adfea105513",
        "output_index": 1
    },
    "service_fee_policyid": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec",
    "service_fee_assetname": "54616c6f73",
    "service_fee": 1000,
    "penalty_fee_policyid": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec",
    "penalty_fee_assetname": "54616c6f73",
    "penalty_fee": 10,
    "interval_length": 2592000000,
    "num_intervals": 1,
    "is_active": true
}'
```

\
== Withdraw Fees

\
This merchant operation permits withdrawal of accumulated subscription fees from the Payment Contract. It verifies that the request complies with the vesting rules defined in the contract and uses the Payment NFT along with the Service NFT to authorize and execute the withdrawal.

\
*Endpoint:*

\
```sh

  POST https://mainnet.gomaestro-api.org/v1/contracts/subscription/withdrawFees

```

\
*Required Parameters:*

\
  - *`merchant_address`*: Address of the merchant.

  - *`service_nft_tn`*: The token name for the Service NFT.
  - *`subscriber_nft_tn`*: The token name for the Subscriber NFT.
  - *`merchant_nft_tn`*: The token name proving merchant ownership.
  - *`payment_nft_tn`*: The Payment NFT token involved.
  - *`current_time`*: Current Unix timestamp to validate withdrawal timing.

\
*cURL Example:*

```sh
# subscription: merchant withdrawal
curl --location 'https://mainnet.gomaestro-api.org/v1/contracts/subscription/withdrawFees' \
--header 'Content-Type: application/json' \
--header 'api-key ${API_KEY}' \
--data '{
    "merchant_address": "addr1qxccwptmx6r523vxcrplvfhtrpdut8s0hht0fyt9f8vy8385chtg2dupkyqu7pgqawju7awrwfg94skstmaves6hwaks6qlgf4",
    "service_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "subscriber_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "merchant_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "payment_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "current_time": 1696320000
}'
```


#pagebreak()
#v(50pt)


= Subscriber Operations

\
Subscriber operations cover account creation, subscription initiation, and unsubscription. These endpoints enable users to register for services, lock funds, and later cancel subscriptions according to the contract rules.

\
== Create User Account
\
This endpoint creates a subscriber account by minting an Account NFT along with its reference NFT. It binds subscriber details (such as *`email`* or *`phone`*) to ensure account integrity before locking funds for subscriptions.

\
*Endpoint:*

\
```sh
  POST https://mainnet.gomaestro-api.org/v1/contracts/subscription/createUserAccount

```
\
*Required Parameters:*

\
  - *`subscriber_address`*: Address of the subscriber.

  - *`selected_out_ref`*: UTxO with *`tx_hash`* and *`output_index`*.
  - *`email`*: Subscriber's email address as a string
  - *`phone`*: Subscriber's phone number as a string.

\
*cURL Example:*

\
```sh
# subscription: create user account
curl --location 'https://mainnet.gomaestro-api.org/v1/contracts/subscription/createUserAccount' \
--header 'Content-Type: application/json' \
--header 'api-key ${API_KEY}' \
--data '{
    "subscriber_address": "addr1qxccwptmx6r523vxcrplvfhtrpdut8s0hht0fyt9f8vy8385chtg2dupkyqu7pgqawju7awrwfg94skstmaves6hwaks6qlgf4",
    "selected_out_ref": {
        "tx_hash": "f68f85ee40866144f52d8087414cfb11ec22539b3772882440bf0adfea105513",
        "output_index": 1
    },
    "email": "",
    "phone": ""
}'
```

\
== Initiate Subscription

\

Locks funds by minting a Payment NFT and setting up a Payment datum that includes the subscription start time, service reference token, and subscriber reference token.
This action creates a unique Payment Token that signifies the start of a subscription.

\
*Endpoint:*

\
```sh
  POST https://mainnet.gomaestro-api.org/v1/contracts/subscription/initSubscription

```

\
*Required Parameters:*

\
  - *`service_nft_tn`*: Combined token string for the service NFT.

  - *`subscriber_nft_tn`*: Combined token string for the subscriber NFT.
  - *`subscription_start`*: Unix timestamp marking the start of the subscription.

\
*cURL Example:*

\
```sh
# subscription: initiate subscription
curl --location 'https://mainnet.gomaestro-api.org/v1/contracts/subscription/initSubscription' \
--header 'Content-Type: application/json' \
--header 'api-key ${API_KEY}' \
--data '{
    "service_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "subscriber_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "subscription_start": 1696320000
}'
```

\

== Unsubscribe

\
This subscriber operation allows a user to cancel an active subscription. The endpoint processes the unsubscription request, calculates any applicable penalty fees (if the service is still active), and updates the contract state.

\
*Endpoint:*

\
```sh
  POST https://mainnet.gomaestro-api.org/v1/contracts/subscription/unsubscribe

```

\
*Required Parameters:*

\
  - *`subscriber_address`*: Address of the subscriber initiating the unsubscription.

  - *`service_nft_tn`*: The token string for the Service NFT.
  - *`subscriber_nft_tn`*: The token string for the Subscriber NFT.
  - *`current_time`*: Unix timestamp used for validating penalty application.

\
*cURL Example:*

\
```sh
# subscription: unsubscribe
curl --location 'https://mainnet.gomaestro-api.org/v1/contracts/subscription/unsubscribe' \
--header 'Content-Type: application/json' \
--header 'api-key ${API_KEY}' \
--data '{
    "subscriber_address": "addr1qxccwptmx6r523vxcrplvfhtrpdut8s0hht0fyt9f8vy8385chtg2dupkyqu7pgqawju7awrwfg94skstmaves6hwaks6qlgf4",
    "service_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "subscriber_nft_tn": "97bbb7db0baef89caefce61b8107ac74c7a7340166b39d906f174bec54616c",
    "current_time": 1696320000
}'
```

\
*Note:* Early termination may incur penalties if defined in the service contract.

#pagebreak()
#v(50pt)

Conclusion
This guide has provided a comprehensive walkthrough for using the Payment Subscription smart contract via Maestro’s API endpoints. By following these instructions, developers can easily:

Register and configure services via the Service Contract.

Enable subscribers to create accounts, initiate subscriptions, and cancel subscriptions.

Facilitate secure fund withdrawals for merchants in accordance with the subscription vesting rules.

Before going live, replace any placeholder values (e.g., *`${API_KEY}`* and wallet addresses) with actual data, and test each endpoint in a sandbox environment. For more detailed technical references, please consult the #git-link and the full #design_docs_link
