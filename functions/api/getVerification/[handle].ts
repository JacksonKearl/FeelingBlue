import { makeVerifiedKey, VerifiedNode } from "../acceptPaymentCompleted"

// Keep in sync with extension/injectScript.ts, can't import/export or it becomes a module :(
type APIResponse = {
    TTL: number,
    data: null | { proof: string, emoji: string }
}

type Env = {
    FEELING_BLUE: KVNamespace
}

export async function onRequestGet(
    { env, params }:
        { env: Env, params: { handle: string } }) {
    const verifiedKey = makeVerifiedKey(params.handle)
    const verifiedNode = await env.FEELING_BLUE.get<VerifiedNode>(verifiedKey, "json")

    const response: APIResponse = verifiedNode
        ? {
            data: {
                emoji: verifiedNode.emoji,
                proof: verifiedNode.proof,
            },
            TTL: 1 * 24 * 60 * 60,
        }
        : { data: null, TTL: 30 * 60 }

    return new Response(JSON.stringify(response), {
        headers: new Headers({ 'Access-Control-Allow-Origin': 'https://twitter.com' })
    })
}