// derived from https://github.com/stripe/stripe-js

// MIT License

// Copyright (c) 2017 Stripe

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

class SubtleCryptoProvider {
    subtleCrypto: SubtleCrypto

    constructor() {
        this.subtleCrypto = crypto.subtle
    }

    async computeHMACSignatureAsync(
        payload: string,
        secret: string
    ): Promise<string> {
        const encoder = new TextEncoder()

        const key = await this.subtleCrypto.importKey(
            'raw',
            encoder.encode(secret),
            {
                name: 'HMAC',
                hash: { name: 'SHA-256' },
            },
            false,
            ['sign']
        )

        const signatureBuffer = await this.subtleCrypto.sign(
            'hmac',
            key,
            encoder.encode(payload)
        )

        // crypto.subtle returns the signature in base64 format. This must be
        // encoded in hex to match the CryptoProvider contract. We map each byte in
        // the buffer to its corresponding hex octet and then combine into a string.
        const signatureBytes = new Uint8Array(signatureBuffer)
        const signatureHexCodes = new Array(signatureBytes.length)

        for (let i = 0; i < signatureBytes.length; i++) {
            signatureHexCodes[i] = byteHexMapping[signatureBytes[i]]
        }

        return signatureHexCodes.join('')
    }
}

const cryptoProvider = new SubtleCryptoProvider()

// Cached mapping of byte to hex representation. We do this once to avoid re-
// computing every time we need to convert the result of a signature to hex.
const byteHexMapping = new Array(256)
for (let i = 0; i < byteHexMapping.length; i++) {
    byteHexMapping[i] = i.toString(16).padStart(2, '0')
}

const signature = {
    EXPECTED_SCHEME: 'v1',

    async verifyHeaderAsync(
        encodedPayload: ArrayBuffer,
        encodedHeader: string,
        secret: string,
        tolerance: number,
    ) {
        const {
            decodedHeader: header,
            decodedPayload: payload,
            details,
        } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME)

        const expectedSignature = await cryptoProvider.computeHMACSignatureAsync(
            makeHMACContent(payload, details),
            secret
        )

        return validateComputedSignature(
            payload,
            header,
            details,
            expectedSignature,
            tolerance
        )
    },
}

const textDecoder = new TextDecoder('utf-8')

class Webhook {
    DEFAULT_TOLERANCE = 300 // 5 minutes
    signature = signature

    async constructEventAsync(
        payload: ArrayBuffer,
        header: string,
        secret: string,
    ) {
        await this.signature.verifyHeaderAsync(
            payload,
            header,
            secret,
            this.DEFAULT_TOLERANCE
        )

        const stringPayload = textDecoder.decode(payload)

        const jsonPayload = JSON.parse(stringPayload)
        return jsonPayload
    }
}

function makeHMACContent(payload: string, details: { timestamp: any, signatures?: string[] }) {
    return `${details.timestamp}.${payload}`
}

function parseEventDetails(encodedPayload: ArrayBuffer, encodedHeader: string, expectedScheme: any) {
    // in web context this will be a string always, probably. 
    const decodedPayload = textDecoder.decode(encodedPayload)

    // Express's type for `Request#headers` is `string | []string`
    // which is because the `set-cookie` header is an array,
    // but no other headers are an array (docs: https://nodejs.org/api/http.html#http_message_headers)
    // (Express's Request class is an extension of http.IncomingMessage, and doesn't appear to be relevantly modified: https://github.com/expressjs/express/blob/master/lib/request.js#L31)
    if (Array.isArray(encodedHeader)) {
        throw new Error(
            'Unexpected: An array was passed as a header, which should not be possible for the stripe-signature header.'
        )
    }

    const decodedHeader = encodedHeader

    const details = parseHeader(decodedHeader, expectedScheme)

    if (!details || details.timestamp === -1) {
        throw new Error('Unable to extract timestamp and signatures from header')
    }

    if (!details.signatures.length) {
        throw new Error('No signatures found with expected scheme')
    }

    return {
        decodedPayload,
        decodedHeader,
        details,
    }
}

function scmpCompare(a, b) {
    const len = a.length
    let result = 0
    for (let i = 0; i < len; ++i) {
        result |= a[i] ^ b[i]
    }
    return result === 0
}

function validateComputedSignature(
    payload: string,
    header: string,
    details: { timestamp: any, signatures: any },
    expectedSignature: string,
    tolerance: number
) {
    const signatureFound = !!details.signatures.filter(
        sig => scmpCompare(sig, expectedSignature)
    ).length

    if (!signatureFound) {
        throw new Error(
            'No signatures found matching the expected signature for payload.' +
            ' Are you passing the raw request body you received from Stripe?' +
            ' https://github.com/stripe/stripe-node#webhook-signing',
        )
    }

    const timestampAge = Math.floor(Date.now() / 1000) - details.timestamp

    if (tolerance > 0 && timestampAge > tolerance) {
        throw new Error('Timestamp outside the tolerance zone')
    }

    return true
}

function parseHeader(header, scheme) {
    if (typeof header !== 'string') {
        return null
    }

    return header.split(',').reduce(
        (accum, item) => {
            const kv = item.split('=')

            if (kv[0] === 't') {
                accum.timestamp = parseInt(kv[1], 10)
            }

            if (kv[0] === scheme) {
                accum.signatures.push(kv[1])
            }

            return accum
        },
        {
            timestamp: -1,
            signatures: [] as string[],
        }
    )
}

export { Webhook }