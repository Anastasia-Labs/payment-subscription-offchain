#let image-background = image("/docs/images/background-1.jpg", height: 100%, fit: "cover")
#let image-foreground = image("/docs/images/Logo-Anastasia-Labs-V-Color02.png", width: 100%, fit: "contain")
#let image-header = image("/docs/images/Logo-Anastasia-Labs-V-Color01.png", height: 75%, fit: "contain")
#let fund-link = link("https://projectcatalyst.io/funds/11/cardano-use-cases-product/anastasia-labs-x-maestro-plug-n-play-20")[Catalyst Proposal]
#let git-link = link(" https://github.com/Anastasia-Labs/payment-subscription")[Payment Subscription Github Repo]
#let maestro_link = link("https://docs.gomaestro.org/getting-started")[Maestro Getting Started]

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
      Proof of Achievement - Milestone 1
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
  - Seamless integration with popular wallet applications

#pagebreak()
#v(50pt)

= Prerequisites
\
Before you begin, ensure that you have:

\
  - *Access Credentials:*
    - Maestro API Key (Get from *#maestro_link*)

    - Cardano wallet address with sufficient funds

  - *Environment Setup:* Basic familiarity with REST APIs and JSON data formats.

#pagebreak()
#v(50pt)

= Smart Contract Overview
\
The Payment Subscription smart contract comprises three main components:

\
+ *Service Contract:* 

  - Initiates services by minting service NFTs.

  - Manages updates and deactivation of services.

+ *Account Contract:* 

  - Registers a subscriber account by minting a CIP-68 compliant Account NFT.

  - Facilitates metadata updates or account removal.

+  *Payment Contract:* Handles the core functionality, including:

  - Prepaid subscription fee management.

  - Subscription renewal, extension, or cancellation.
  - Gradual fund release with linear vesting.
  \
Each function is accompanied by detailed onchain and offchain documentation. This guide focuses on how each API endpoint maps to these smart contract functionalities.

#pagebreak()
#v(50pt)

= Merchant Operations

\
== Create a Service
\
Merchants use this to define subscription terms and effectively create a new Service.

  - Uses the Service Validator to mint a Service NFT and its corresponding reference NFT.

  - Validates the service fee, penalty fee, interval length, and activation status.

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

  - *`selected_out_ref`*: Object containing tx_hash and output_index used to derive token names.

  - *`service_fee_policyid`*, *`service_fee_assetname`*, *`service_fee`*: Define the fee for the service.
  - *`penalty_fee_policyid`*, *`penalty_fee_assetname`*, *`penalty_fee`*: Define the penalty fee.
  - *`interval_length`*: Subscription interval duration (in milliseconds).
  - *`num_intervals`*: Total number of intervals.
  - *`is_active`*: Boolean flag indicating the service’s active state.

#pagebreak()
#v(50pt)

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
Allows the merchant to withdraw the accumulated subscription fees.
Uses the Payment Validator’s _MerchantWithdraw_ redeemer and enforces linear vesting rules as specified.

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
== Create User Account
\
Subscribers create an account to manage subscriptions.

  - Uses the Account Validator to mint an Account NFT and its reference NFT.

  - Registers a subscriber's account with either an email hash or a phone hash.

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
  - *`email`* and *`phone`*: Credentials as a string.

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
Allows a subscriber to cancel their active subscription.

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
