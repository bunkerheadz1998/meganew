const apiUrl = process.env.VUE_APP_API_URL

export async function fetchObjects(room = 'default') {
	const res = await fetch(`${apiUrl}/objects?room=${encodeURIComponent(room)}`)
	if (!res.ok) throw new Error(`Failed to fetch objects: ${res.statusText}`)

	return res.json()
}

export async function saveObject(object) {
	const res = await fetch(`${apiUrl}/objects`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(object),
	})
	if (!res.ok) throw new Error(`Failed to save object: ${res.statusText}`)
	return res.json()
}

