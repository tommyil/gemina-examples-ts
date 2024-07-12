# Gemina API - Quick Implementation Guide - NodeJS / TypeScript



It's fast and easy to implement the Gemina Invoice Analysis.



First, define the API key that you were given, as well as the Client Id:

```ts
public const string API_KEY = "== YOUR API KEY ==";
public const string CLIENT_ID = "== YOUR CLIENT KEY ==";
```



Also define the Gemina URL and endpoints:

```ts
const GEMINA_API_URL = "https://api.gemina.co.il/v1";
const UPLOAD_URL = "/uploads";
const BUSINESS_DOCUMENTS_URL = "/business_documents";
```



If you use a web image (instead of uploading one), then set the URL of the invoice.
In addition, don't forget to update the upload URL to web.

```ts
const INVOICE_URL = "== YOUR INVOICE URL ==";
const WEB_UPLOAD_URL = "/uploads/web";
```


## Preliminary Configuration:
```bash
npm install -g ts-node
npm install uuid
npm i fs
npm install node-fetch@2.6.7
npm install --save-dev @types/node-fetch@2.x
cd src
npx ts-node app.ts
```



Next, start implementing Gemina.

It happens in  2 steps:



------



## Step 1 - Upload Invoice

Here you upload a Business Document (for example: an invoice / credit invoice / receipt, and more) in an image format (we support all the available formats e.g. Jpeg / PNG / PDF).

The server will return the status code **201** to signify that the image has been added and that processing has started.

*If you use the same endpoint again*, you will find out that the server returns a *202 code*, to let you know that the same image has already been accepted, and there's no need to upload it again.

It could also return *409 if a prediction already exists for that image*.

Please note that the image file needs to be encoded as Base64 and then added to the json payload as "*file*".



```ts
async function uploadImage() {
    let url : string = `${GEMINA_API_URL}${UPLOAD_URL}`;
    let token : string = `Basic ${API_KEY}`;  // Mind the space between 'Basic' and the API KEY
    let imageBase64 = readFileSync('./invoice.png', {encoding: 'base64'});

    // 👇️ const response: Response
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            "external_id": IMAGE_ID,
            "client_id": CLIENT_ID,
            "use_llm": true,  // <-- Optional, for LLM Support. For more details: https://github.com/tommyil/gemina-examples/blob/master/llm_integration.md
            "file": imageBase64,
        }),
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Authorization': token,
        },
    });

    if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
    }

    // 👇️ const result: UploadImageResponse
    const result = (await response.json()) as UploadImageResponse;

    console.log('result is: ', JSON.stringify(result, null, 4));

    return [result, response.status];
}
```



**Alternatively,** you can submit an existing web image here:

```ts
async function uploadWebImage() {
    let url : string = `${GEMINA_API_URL}${WEB_UPLOAD_URL}`;
    let token : string = `Basic ${API_KEY}`;  // Mind the space between 'Basic' and the API KEY

    // 👇️ const response: Response
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
            "external_id": IMAGE_ID,
            "client_id": CLIENT_ID,
            "use_llm": true,  // <-- Optional, for LLM Support. For more details: https://github.com/tommyil/gemina-examples/blob/master/llm_integration.md
            "url": INVOICE_URL,
        }),
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Authorization': token,
        },
    });

    if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
    }

    // 👇️ const result: UploadImageResponse
    const result = (await response.json()) as UploadImageResponse;

    console.log('result is: ', JSON.stringify(result, null, 4));

    return [result, response.status];
}
```



Here's how you use the above methods:

```ts
// ### Step I:  Upload Image to the Gemina API ###

const [uploadResult, uploadStatus] = await uploadImage();
//const [uploadResult, uploadStatus] = await uploadWebImage(); <-- Alternatively, enable the line for Web Upload, and disable the previous line.
console.log('parsed result is: ', uploadResult, 'status code:', uploadStatus);

switch(uploadStatus)
{
    case 201:
        console.log("Uploaded Successfully.");
        break;
    
    case 202:
        console.log("Image is already being processed. No need to upload again.");
        break;    
    
    case 409:
        console.log("Image already exists. No need to upload again.");
        break;    
}
```



------



## Step 2 - Get Prediction

Here you retrieve a prediction for the invoice that you uploaded during the first step.
The json response will be parsed into TypeScript objects.



**Retrieve Prediction as Json :**

You have to wait until the document finished processing.

Therefore you need to keep asking the server when the prediction is ready.



When it's not yet ready, the server will return either 404 (not found) or 202 (accepted and in progress).

*When Ready, the server will return **200**, with the prediction payload*.



```ts
async function getPrediction() {
    let url : string = `${GEMINA_API_URL}${BUSINESS_DOCUMENTS_URL}/${IMAGE_ID}`;
    let token : string = `Basic ${API_KEY}`;  // Mind the space between 'Basic' and the API KEY

    // 👇️ const response: Response
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Authorization': token,
        },
    });

    if (!(response.status == 200 || response.status == 202 || response.status == 404)) {
        throw new Error(`Error! status: ${response.status}`);
    }

    // 👇️ const result: GetUsersResponse
    const result = (await response.json()) as Prediction;

    console.log('result is: ', JSON.stringify(result, null, 4));

    return [result, response.status];
}
```



```ts
// ### Step II:  Retrieve Prediction for the Uploaded Image ###
do {
    var [predictionResult, predictionStatus] = await getPrediction();

    switch(predictionStatus)
    {
        case 202:
            console.log("Image is still being processed.Sleeping for 1 second before the next attempt.");
            await sleep(1000);
            break;

        case 404:
            console.log("Can't find image. Let's give it 1 seconds to create before we try again...");
            await sleep(1000);
            break;
        
        case 200:
            console.log("The Prediction Object Data has been successfully stored in Prediction object.");
            break;
    }
} while (predictionStatus == 202 || predictionStatus == 404);

console.log('parsed result is: ', predictionResult, 'status code:', predictionStatus);
```



------



## Output

```bash
result is:  {
    "timestamp": 1665422221.931011,
    "created": "2022-10-10T17:17:01.931011",
    "external_id": "1400b214-3e74-49a0-bd58-c0e5a911c085"
}
parsed result is:  {
  timestamp: 1665422221.931011,
  created: '2022-10-10T17:17:01.931011',
  external_id: '1400b214-3e74-49a0-bd58-c0e5a911c085'
} status code: 201
Uploaded Successfully.
result is:  {
    "timestamp": 1665422222.161168,
    "created": "2022-10-10T17:17:02.161168",
    "external_id": "1400b214-3e74-49a0-bd58-c0e5a911c085"
}
Image is still being processed.Sleeping for 1 second before the next attempt.
result is:  {
    "timestamp": 1665422222.161168,
    "created": "2022-10-10T17:17:02.161168",
    "external_id": "1400b214-3e74-49a0-bd58-c0e5a911c085"
}
Image is still being processed.Sleeping for 1 second before the next attempt.
result is:  {
    "assignment_number": {
        "confidence": "high",
        "coordinates": null,
        "value": null
    },
    "currency": {
        "coordinates": null,
        "value": "ils",
        "confidence": "medium"
    },
    "external_id": "1400b214-3e74-49a0-bd58-c0e5a911c085",
    "primary_document_type": {
        "coordinates": null,
        "value": "invoice",
        "confidence": "high"
    },
    "net_amount": {
        "coordinates": {
            "normalized": [
                [
                    174,
                    877
                ],
                [
                    243,
                    877
                ],
                [
                    243,
                    896
                ],
                [
                    174,
                    896
                ]
            ],
            "relative": [
                [
                    0.14,
                    0.5
                ],
                [
                    0.2,
                    0.5
                ],
                [
                    0.2,
                    0.51
                ],
                [
                    0.14,
                    0.51
                ]
            ],
            "original": [
                [
                    232,
                    1167
                ],
                [
                    323,
                    1167
                ],
                [
                    323,
                    1192
                ],
                [
                    232,
                    1192
                ]
            ]
        },
        "value": 1343.59,
        "confidence": "high"
    },
    "supplier_name": {
        "coordinates": null,
        "value": "חמשת הפסים קלין בע\"מ",
        "confidence": "high"
    },
    "vat_amount": {
        "coordinates": {
            "normalized": [
                [
                    189,
                    908
                ],
                [
                    242,
                    908
                ],
                [
                    242,
                    926
                ],
                [
                    189,
                    926
                ]
            ],
            "relative": [
                [
                    0.15,
                    0.52
                ],
                [
                    0.2,
                    0.52
                ],
                [
                    0.2,
                    0.53
                ],
                [
                    0.15,
                    0.53
                ]
            ],
            "original": [
                [
                    251,
                    1208
                ],
                [
                    322,
                    1208
                ],
                [
                    322,
                    1232
                ],
                [
                    251,
                    1232
                ]
            ]
        },
        "value": 228.41,
        "confidence": "high"
    },
    "created": "2022-10-10T17:17:02.787240",
    "timestamp": 1665422222.78724,
    "document_number": {
        "coordinates": {
            "normalized": [
                [
                    411,
                    294
                ],
                [
                    500,
                    294
                ],
                [
                    500,
                    325
                ],
                [
                    411,
                    325
                ]
            ],
            "relative": [
                [
                    0.33,
                    0.17
                ],
                [
                    0.4,
                    0.17
                ],
                [
                    0.4,
                    0.19
                ],
                [
                    0.33,
                    0.19
                ]
            ],
            "original": [
                [
                    547,
                    391
                ],
                [
                    665,
                    391
                ],
                [
                    665,
                    433
                ],
                [
                    547,
                    433
                ]
            ]
        },
        "value": 7890,
        "confidence": "high"
    },
    "document_type": {
        "coordinates": null,
        "value": "invoice",
        "confidence": "high"
    },
    "expense_type": {
        "coordinates": null,
        "value": "other",
        "confidence": "medium"
    },
    "issue_date": {
        "coordinates": {
            "normalized": [
                [
                    174,
                    410
                ],
                [
                    264,
                    411
                ],
                [
                    264,
                    426
                ],
                [
                    174,
                    425
                ]
            ],
            "relative": [
                [
                    0.14,
                    0.23
                ],
                [
                    0.21,
                    0.23
                ],
                [
                    0.21,
                    0.24
                ],
                [
                    0.14,
                    0.24
                ]
            ],
            "original": [
                [
                    232,
                    546
                ],
                [
                    351,
                    547
                ],
                [
                    351,
                    567
                ],
                [
                    232,
                    566
                ]
            ]
        },
        "value": "31/08/2020",
        "confidence": "high"
    },
    "payment_method": {
        "coordinates": null,
        "value": "wire_transfer",
        "confidence": "medium"
    },
    "total_amount": {
        "coordinates": {
            "normalized": [
                [
                    156,
                    936
                ],
                [
                    240,
                    935
                ],
                [
                    240,
                    959
                ],
                [
                    156,
                    960
                ]
            ],
            "relative": [
                [
                    0.13,
                    0.53
                ],
                [
                    0.19,
                    0.53
                ],
                [
                    0.19,
                    0.55
                ],
                [
                    0.13,
                    0.55
                ]
            ],
            "original": [
                [
                    208,
                    1246
                ],
                [
                    319,
                    1244
                ],
                [
                    319,
                    1276
                ],
                [
                    208,
                    1278
                ]
            ]
        },
        "value": 1572,
        "confidence": "high"
    },
    "business_number": {
        "coordinates": {
            "normalized": [
                [
                    182,
                    198
                ],
                [
                    302,
                    200
                ],
                [
                    302,
                    223
                ],
                [
                    182,
                    221
                ]
            ],
            "relative": [
                [
                    0.15,
                    0.11
                ],
                [
                    0.24,
                    0.11
                ],
                [
                    0.24,
                    0.13
                ],
                [
                    0.15,
                    0.13
                ]
            ],
            "original": [
                [
                    242,
                    264
                ],
                [
                    402,
                    266
                ],
                [
                    402,
                    297
                ],
                [
                    242,
                    294
                ]
            ]
        },
        "value": 514713288,
        "confidence": "high"
    }
}
The Prediction Object Data has been successfully stored in Prediction object.
parsed result is:  {
  currency: { coordinates: null, value: 'ils', confidence: 'medium' },
  external_id: '1400b214-3e74-49a0-bd58-c0e5a911c085',
  primary_document_type: { coordinates: null, value: 'invoice', confidence: 'high' },
  net_amount: {
    coordinates: { normalized: [Array], relative: [Array], original: [Array] },
    value: 1343.59,
    confidence: 'high'
  },
  supplier_name: {
    coordinates: null,
    value: 'חמשת הפסים קלין בע"מ',
    confidence: 'high'
  },
  vat_amount: {
    coordinates: { normalized: [Array], relative: [Array], original: [Array] },
    value: 228.41,
    confidence: 'high'
  },
  created: '2022-10-10T17:17:02.787240',
  timestamp: 1665422222.78724,
  document_number: {
    coordinates: { normalized: [Array], relative: [Array], original: [Array] },
    value: 7890,
    confidence: 'high'
  },
  document_type: { coordinates: null, value: 'invoice', confidence: 'high' },
  expense_type: { coordinates: null, value: 'other', confidence: 'medium' },
  issue_date: {
    coordinates: { normalized: [Array], relative: [Array], original: [Array] },
    value: '31/08/2020',
    confidence: 'high'
  },
  payment_method: { coordinates: null, value: 'wire_transfer', confidence: 'medium' },
  total_amount: {
    coordinates: { normalized: [Array], relative: [Array], original: [Array] },
    value: 1572,
    confidence: 'high'
  },
  business_number: {
    coordinates: { normalized: [Array], relative: [Array], original: [Array] },
    value: 514713288,
    confidence: 'high'
  }
} status code: 200
```



------



## Other Features



#### Pass the Client Tax Id

To facilitate the algorithm's work and increase accuracy, you can pass the Client's Tax Id to the API with each Json call.

This will help to avoid situations where the Client's Tax Id is mistakenly interpreted as the Supplier's Tax Id (or Business Number).



To do so, add the following line to the Dictionary (that is, to your Json):

```ts
'client_business_number': "== Your Client's Business Number ==",
```

------

Full example:

```ts
const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
        "external_id": IMAGE_ID,
        "client_id": CLIENT_ID,
        "url": INVOICE_URL,
        "client_business_number": "== Your Client's Business Number ==",
    }),
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Authorization': token,
    },
});
```

The `client_business_number` can be represented either by `string` or `int`.



------



## More Resources



Response Types - https://github.com/tommyil/gemina-examples/blob/master/response_types.md

Data Loop - https://github.com/tommyil/gemina-examples/blob/master/data_loop.md

LLM Integration - https://github.com/tommyil/gemina-examples/blob/master/llm_integration.md

Python Implementation - https://github.com/tommyil/gemina-examples

C# Implementation - https://github.com/tommyil/gemina-examples-cs



------



The full example code is available here:

[Image / Web Image Upload](https://github.com/tommyil/gemina-examples-ts/blob/main/src/app.ts)



For more details, please refer to the [API documentation](https://api.gemina.co.il/swagger/).

You can also contact us [here](mailto:info@gemina.co.il).

