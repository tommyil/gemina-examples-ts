import fetch from 'node-fetch';
import { sleep } from './lib/utils';
import {v4 as uuidv4} from 'uuid';
import { readFileSync } from 'fs';


const API_KEY = "== YOUR API KEY ==";
const CLIENT_ID = "== YOUR CLIENT KEY ==";

const GEMINA_API_URL = "https://api.gemina.co.il/v1";
const UPLOAD_URL = "/uploads";
const WEB_UPLOAD_URL = "/uploads/web";
const BUSINESS_DOCUMENTS_URL = "/business_documents";

const INVOICE_URL = "== YOUR INVOICE URL ==";
const IMAGE_ID = uuidv4();



type UploadImageResponse = {
    timestamp: Number;
    created: Date;
    external_id: string;
  };

type Coordinates = {
    original: Number[][];
    normalized: Number[][];
    relative: Number[][];
};

type GeneralValue = {
    coordinates: Coordinates;
    confidence: string;
    value: object;
};

type Prediction = {
    total_amount: GeneralValue;
    vat_amount: GeneralValue;
    created: Date;
    timestamp: Date,
    primary_document_type: GeneralValue,
    external_id: string,
    currency: GeneralValue,
    business_number: GeneralValue,
    issue_date: GeneralValue,
    document_type: GeneralValue,
    expense_type: GeneralValue,
    payment_method: GeneralValue,
    document_number: GeneralValue,
    net_amount: GeneralValue,
    supplier_name: GeneralValue,
};


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


async function main() {
    try {

        // ### Step I:  Upload Image to the Gemina API ###
        const [uploadResult, uploadStatus] = await uploadImage();
        //const [uploadResult, uploadStatus] = await uploadWebImage(); <-- Enable instead for Web Upload, and disable the previous line.
        console.log('parsed result is: ', uploadResult, 'status code:', uploadStatus);
        switch(uploadStatus)
        {
            case 201:
                console.log("Uploaded Successfully.");
                break;
            
            case 202:
                console.log("Image is already being processed. No need to upload again.");
                break;    
        }

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
    }

    catch (error) {
        if (error instanceof Error) {
            console.log('error message: ', error.message);
        } else {
            console.log('unexpected error: ', error);
        }
    }
}

main();
