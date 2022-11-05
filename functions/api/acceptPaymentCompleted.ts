import { Webhook } from '../../lib/stripeWebHooks'
import { makePendingKey, PendingNode } from './acceptVerificationRequest'

type Env = {
    TWITTER_GUEST_TOKEN: string,
    STRIPE_WEBHOOK_SECRET: string,
    FEELING_BLUE: KVNamespace,
    FEELING_BLUE_LOGS?: KVNamespace,
}

export type VerifiedNode = {
    email: string,
    user: string,
    emoji: string,
    proof: string,
    survey: { love: string, literal: string, ye: string, reason: string, judge: string },
}

export const makeVerifiedKey = (userName: string) => 'verified_twitter_' + userName

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
    const sig = request.headers.get('stripe-signature')
    const payload = await request.arrayBuffer()

    let event
    let success = false

    const log: Record<string, string | boolean | number> = {}
    const sendLogs = () => {
        if (!success) {
            env.FEELING_BLUE_LOGS?.put(new Date().toISOString(), JSON.stringify(log))
        }
    }

    try {
        event = await new Webhook().constructEventAsync(payload, sig ?? '', env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
        log.webhook_error = (err as any).message
        sendLogs()
        return new Response(`Webhook Error: ${(err as any).message} `, { status: 400 })
    }

    let response = new Response(`Ew.`, { status: 400 })
    try {
        if (event.type === 'checkout.session.completed') {
            log.payment_received = true

            const email = event.data?.object?.customer_details?.email
            if (email) {
                log.email = email

                const pendingKey = makePendingKey(email)
                const pendingNode = await env.FEELING_BLUE.get(pendingKey)

                if (pendingNode) {
                    log.pending_node = pendingNode

                    const data = JSON.parse(pendingNode) as PendingNode
                    const verifiedKey = makeVerifiedKey(data.user)
                    const existing = await env.FEELING_BLUE.get(verifiedKey)

                    if (existing) {
                        log.duplicate_purchase = JSON.stringify({ email, user: data.user })
                    } else {
                        const tweetContents = await getTwitterPostData(env.TWITTER_GUEST_TOKEN, data.proof)
                        log.tweet_contents = tweetContents

                        if (tweetContents.toLowerCase().includes('zabaglione')) {
                            log.verification_succeeded = true

                            const node: VerifiedNode = {
                                email: data.email,
                                emoji: data.emoji,
                                user: data.user,
                                proof: data.proof,
                                survey: data.survey,
                            }

                            await env.FEELING_BLUE.put(verifiedKey, JSON.stringify(node))
                            await env.FEELING_BLUE.delete(pendingKey)

                            success = true
                            response = new Response(`Nice.`, { status: 200 })
                        }
                    }
                }
            }
        }
    } catch (e) {
        log.validation_error = (e as any)?.message
        response = new Response(`Oops.`, { status: 500 })
    } finally {
        sendLogs()
        return response
    }
}

const getTwitterPostData = async (token: string, post: string): Promise<string> => {
    const headers = new Headers({
        'Authorization': `Bearer ${token} `
    })

    let twitterData
    try {
        const twitterPost = await fetch(`https://api.twitter.com/2/timeline/conversation/${post}.json`, { headers })
        twitterData = await twitterPost.json() as any
        const tweet = twitterData?.globalObjects?.tweets?.[post]
        const text = tweet.text
        const created = +new Date(tweet['created_at'])
        const epoch = +new Date('2020-11-04T01:32:55.232Z')
        if (created < epoch) {
            return 'Timeout.'
        }
        return text
    } catch (e) {
        return JSON.stringify({ e: (e as any).message, twitterData })
    }
}