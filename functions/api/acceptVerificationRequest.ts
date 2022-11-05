import { makeVerifiedKey } from "./acceptPaymentCompleted"

type Env = {
    RECAPTCHA_SECRET: string,
    STRIPE_PAYMENT_LINK: string,
    FEELING_BLUE: KVNamespace
}

export type PendingNode = {
    email: string, emoji: string, proof: string,
    user: string,
    creationDate: string,
    survey: { love: string, literal: string, ye: string, reason: string, judge: string },
    paymentLink: string,
}

export const makePendingKey = (email: string) => 'pending_twitter_' + email

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
    const data = await request.json() as any
    const {
        email, proof, emoji,
        love, reason, ye, literal, judge,
        grecaptcharesponse,
    } = data

    const recaptchaBody = new URLSearchParams(
        Object.entries(
            {
                secret: env.RECAPTCHA_SECRET,
                response: grecaptcharesponse,
            }
        )).toString()

    const verificationRequest = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: recaptchaBody,
        })

    const verificationData = await verificationRequest.json() as any

    if (!verificationData || !verificationData.success) {
        return new Response('You\'re literally a bot.', { status: 403 })
    }

    if (!email || !proof || !emoji || !love || !reason || !ye || !literal || !judge) {
        return new Response('You might not be a bot, but you\'re a pretty dumb human.', { status: 400 })
    }

    const node: PendingNode = {
        email, emoji, proof,
        creationDate: new Date().toISOString(),
        user: '',
        survey: { love, literal, ye, reason, judge },
        paymentLink: env.STRIPE_PAYMENT_LINK
    }

    const parseTwitter = /https:\/\/twitter.com\/([^/]*)\/status\/(\d*)/.exec(proof)
    if (!parseTwitter) {
        return new Response('You might not be a bot, but you\'re a pretty dumb human.', { status: 400 })
    }

    const [_, user, postId] = parseTwitter
    node.user = user
    node.proof = postId

    const nodeString = JSON.stringify(node)
    if (nodeString.length > 2000) {
        return new Response('I ain\'t reading all that.', { status: 413 })
    }

    if (await env.FEELING_BLUE.get(makeVerifiedKey(user))) {
        return new Response('You\'ve already been verified.', { status: 409 })
    }

    const key = makePendingKey(email)
    await env.FEELING_BLUE.put(key, nodeString, { expirationTtl: 60 * 60 * 24 * 7 })

    return new Response(nodeString)
}
