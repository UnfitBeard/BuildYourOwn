// parsed HTTP Request Header
type HTTPReq = {
    method: string,
    uri: Buffer,
    version: string,
    headers: Buffer[],
}

// HTTP Response
type HTTPRes = {
    code: number,
    headers: Buffer[],
    body: BodyReader,
}

// interface for reading data from the HTTP body
type BodyReader = {
    length: number,
    read: () => Promise<Buffer>,
}


