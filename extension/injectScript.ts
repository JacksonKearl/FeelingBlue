type StorageNode = {
    staleAfter: number,
    data: {
        proof: string,
        emoji: string,
    } | null
}

const defaultTtl = 24 * 60 * 60

// Keep in sync with functions/api/getVerification/[handle].ts, can't import/export or it becomes a module :(
type APIResponse = {
    TTL: number,
    data: null | { proof: string, emoji: string }
}

const getStorageKey = (handle: string) => 'im_feeling_blue_' + handle
const loadNode = async (handle: string): Promise<StorageNode['data'] | null> => {
    const saveNode = (handle: string, node: StorageNode) =>
        localStorage.setItem(getStorageKey(handle), JSON.stringify(node))

    const loadNodeFromStorage = (handle: string): { quality: 'stale' | 'fresh', data: StorageNode['data'] | null } => {
        const string = localStorage.getItem(getStorageKey(handle))
        if (!string) return { quality: 'stale', data: null }
        const { staleAfter, data } = JSON.parse(string) as StorageNode
        if (staleAfter < Date.now()) { return { quality: 'stale', data } }
        return { quality: 'fresh', data }
    }

    let ttl = defaultTtl
    let data: StorageNode['data'] | null = null

    const existing = loadNodeFromStorage(handle)
    if (existing) {
        data = existing.data
    }

    if (existing.quality !== 'fresh') {
        try {
            const latest = await fetch(`https://feelingblue.pages.dev/api/getVerification/${handle}`)
            const apiResponse = await latest.json() as APIResponse
            ttl = apiResponse?.TTL ?? ttl
            data = apiResponse?.data ?? data
        } catch (e) {
            console.error('Failed to refresh data, proceeding with existing', e)
        }
    }

    const staleAfter = Date.now() + (ttl * 1000)
    saveNode(handle, { staleAfter, data })
    return data
}

const trackedSpans = new WeakSet()

const trackSpan = async (span: HTMLSpanElement) => {
    if (trackedSpans.has(span)) { return }
    trackedSpans.add(span)
    if (span.innerText.startsWith('@')) {
        const verification = await loadNode(span.innerText.slice(1))
        if (verification) {

            const badge = document.createElement('a')
            badge.innerText = verification.emoji
            badge.href = verification.proof
            badge.style.textDecoration = 'none'
            badge.style.marginLeft = '2px'
            if (span.parentElement) {
                span.parentElement.style.flexDirection = 'row'
                span.parentElement.appendChild(badge)
            }
        }
    }
}

const trackAllSpans = () =>
    document.querySelectorAll('span').forEach(span => trackSpan(span))

let timeout = 1
const initializeListeners = async () => {
    document.addEventListener('scroll', () => trackAllSpans())
    while (timeout < 60000) {
        await new Promise(resolve => setTimeout(resolve, timeout))
        trackAllSpans()
    }
}

initializeListeners()