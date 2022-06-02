const jimp = require("jimp");
const http = require("http");
const url = require("url");
const axios = require("axios").default;

class RTFileHeader {
    constructor() {
        this.fileTypeId;
        this.version;
        this.reversed;
    }

    serialize(buffer, pos = 0) {
        this.fileTypeId = buffer.subarray(pos, 6).toString();
        pos += 6;

        this.version = buffer.readInt8(pos);
        pos += 1;

        // reverse : uint8_t
        pos += 1;
        return pos;
    }
}

class RTTEXHeader {
    constructor() {
        this.rtFileHeader;
        this.height;
        this.width;
        this.format;
        this.originalHeight;
        this.originalWidth;
        this.usesAlpha;
        this.aleardyCompressed;
        this.reversedFlags;
        this.mipmapCount;
        this.reversed;
    }

    serialize(buffer, pos = 0) {
        this.rtFileHeader = new RTFileHeader();
        pos = this.rtFileHeader.serialize(buffer, pos);

        this.height = buffer.readInt32LE(pos);
        pos += 4;

        this.width = buffer.readInt32LE(pos);
        pos += 4;

        this.format = buffer.readInt32LE(pos);
        pos += 4;

        this.originalHeight = buffer.readInt32LE(pos);
        pos += 4;

        this.originalWidth = buffer.readInt32LE(pos);
        pos += 4;

        this.usesAlpha = buffer.readInt8(pos);
        pos += 1;

        this.aleardyCompressed = buffer.readInt8(pos);
        pos += 1;

        // reservedFlags : unsigned char
        pos += 2;

        this.mipmapCount = buffer.readInt32LE(pos);
        pos += 4;

        // reserved : int[16]
        pos += 64;
        return pos;
    }
}

class RTTEXMipHeader {
    constructor() {
        this.height;
        this.width;
        this.dataSize;
        this.mipLevel;
        this.reversed;
    }

    serialize(buffer, pos = 0) {
        this.height = buffer.readInt32LE(pos);
        pos += 4;

        this.width = buffer.readInt32LE(pos);
        pos += 4;

        this.dataSize = buffer.readInt32LE(pos);
        pos += 4;

        this.mipLevel = buffer.readInt32LE(pos);
        pos += 4;

        // reversed : int[2]
        pos += 8;
        return pos;
    }
}

class RTTEX {
    constructor(buffer, pos = 0) {
        this.rttexHeader = new RTTEXHeader();
        this.buffer = buffer;
        this.pos = this.rttexHeader.serialize(this.buffer, pos);
    }

    rawData(flipVertical = false) {
        if (this.rttexHeader.format != 5121) {
            return;
        }

        for (let i = 0; i < this.rttexHeader.mipmapCount; i++) {
            let mipHeader = new RTTEXMipHeader();
            this.pos = mipHeader.serialize(this.buffer, this.pos);
            let mipData = this.buffer.subarray(this.pos, this.pos + mipHeader.dataSize);

            if (flipVertical) {
                new jimp(mipHeader.width, mipHeader.height, (err, image) => {
                    if (err) throw err;
                    
                    image.bitmap.data.set(mipData);
                    image.flip(false, true);
                    return image.bitmap.data;
                });
            }
        
            return mipData;
        }

        return null;
    }

    write(path, flipVertical = true) {
        new jimp(this.rttexHeader.width, this.rttexHeader.height, (err, image) => {
            if (err) throw err;
            
            image.bitmap.data.set(this.rawData());
            image.flip(false, flipVertical);
            image.write(path);
        });

        return true;
    }
}

class PuzzleCaptchaSolver {
    constructor(rttex) {
        this.check = [
            { x: 11, y: 0, expect: 255 }, { x: 35, y: 1, expect: 0 }, { x: 47, y: 1, expect: 255 }, { x: 27, y: 3, expect: 0 }, { x: 39, y: 3, expect: 255 }, { x: 24, y: 6, expect: 0 }, { x: 36, y: 6, expect: 255 }, { x: 45, y: 10, expect: 0 }, { x: 57, y: 10, expect: 255 }, { x: 30, y: 13, expect: 0 }, { x: 42, y: 13, expect: 0 }, { x: 54, y: 13, expect: 255 }, { x: 66, y: 13, expect: 255 }, { x: 26, y: 17, expect: 0 }, { x: 38, y: 17, expect: 255 }, { x: 10, y: 18, expect: 0 }, { x: 22, y: 18, expect: 0 }, { x: 34, y: 18, expect: 255 }, { x: 46, y: 18, expect: 0 }, { x: 58, y: 18, expect: 0 }, { x: 70, y: 18, expect: 0 }, { x: 82, y: 18, expect: 255 }, { x: 5, y: 19, expect: 0 }, { x: 17, y: 19, expect: 0 }, { x: 29, y: 19, expect: 255 }, { x: 41, y: 19, expect: 255 }, { x: 53, y: 19, expect: 0 }, { x: 65, y: 19, expect: 0 }, { x: 77, y: 19, expect: 255 }, { x: 0, y: 20, expect: 0 }, { x: 12, y: 20, expect: 255 }, { x: 24, y: 20, expect: 255 }, { x: 36, y: 20, expect: 255 }, { x: 48, y: 20, expect: 255 }, { x: 60, y: 20, expect: 255 }, { x: 1, y: 23, expect: 0 }, { x: 13, y: 23, expect: 255 }, { x: 72, y: 25, expect: 0 }, { x: 84, y: 25, expect: 255 }, { x: 71, y: 28, expect: 0 }, { x: 83, y: 28, expect: 255 }, { x: 71, y: 31, expect: 0 }, { x: 83, y: 31, expect: 255 }, { x: 71, y: 34, expect: 0 }, { x: 83, y: 34, expect: 255 }, { x: 71, y: 37, expect: 0 }, { x: 83, y: 37, expect: 255 }, { x: 71, y: 40, expect: 0 }, { x: 83, y: 40, expect: 0 }, { x: 6, y: 41, expect: 255 }, { x: 18, y: 41, expect: 255 }, { x: 0, y: 42, expect: 0 }, { x: 12, y: 42, expect: 0 }, { x: 24, y: 42, expect: 255 }, { x: 36, y: 42, expect: 255 }, { x: 1, y: 43, expect: 0 }, { x: 13, y: 43, expect: 0 }, { x: 25, y: 43, expect: 255 }, { x: 37, y: 43, expect: 255 }, { x: 10, y: 44, expect: 0 }, { x: 22, y: 44, expect: 255 }, { x: 10, y: 45, expect: 0 }, { x: 22, y: 45, expect: 255 }, { x: 2, y: 46, expect: 0 }, { x: 14, y: 46, expect: 255 }, { x: 88, y: 46, expect: 0 }, { x: 11, y: 47, expect: 255 }, { x: 3, y: 48, expect: 0 }, { x: 15, y: 48, expect: 255 }, { x: 18, y: 49, expect: 0 }, { x: 30, y: 49, expect: 255 }, { x: 87, y: 51, expect: 0 }, { x: 10, y: 52, expect: 255 }, { x: 19, y: 54, expect: 0 }, { x: 31, y: 54, expect: 255 }, { x: 18, y: 57, expect: 0 }, { x: 30, y: 57, expect: 255 }, { x: 3, y: 59, expect: 0 }, { x: 15, y: 59, expect: 255 }, { x: 17, y: 60, expect: 0 }, { x: 29, y: 60, expect: 255 }, { x: 8, y: 61, expect: 0 }, { x: 20, y: 61, expect: 255 }, { x: 16, y: 62, expect: 0 }, { x: 28, y: 62, expect: 255 }, { x: 15, y: 63, expect: 0 }, { x: 27, y: 63, expect: 255 }, { x: 14, y: 64, expect: 0 }, { x: 26, y: 64, expect: 255 }, { x: 13, y: 65, expect: 0 }, { x: 25, y: 65, expect: 255 }, { x: 70, y: 66, expect: 0 }, { x: 82, y: 66, expect: 0 }, { x: 5, y: 67, expect: 255 }, { x: 17, y: 67, expect: 255 }, { x: 30, y: 70, expect: 0 }, { x: 42, y: 70, expect: 255 }, { x: 0, y: 72, expect: 0 }, { x: 12, y: 72, expect: 255 }, { x: 45, y: 73, expect: 0 }, { x: 57, y: 73, expect: 255 }, { x: 24, y: 75, expect: 0 }, { x: 36, y: 75, expect: 255 }, { x: 23, y: 77, expect: 0 }, { x: 35, y: 77, expect: 255 }, { x: 1, y: 79, expect: 0 }, { x: 13, y: 79, expect: 255 }, { x: 28, y: 80, expect: 0 }, { x: 40, y: 80, expect: 255 }, { x: 1, y: 82, expect: 0 }, { x: 13, y: 82, expect: 255 }, { x: 30, y: 84, expect: 0 }, { x: 42, y: 84, expect: 255 }, { x: 41, y: 86, expect: 0 }, { x: 53, y: 86, expect: 255 }, { x: 43, y: 87, expect: 0 }, { x: 55, y: 87, expect: 255 }, { x: 10, y: 88, expect: 0 }, { x: 22, y: 88, expect: 0 }, { x: 34, y: 88, expect: 255 }, { x: 46, y: 88, expect: 0 }, { x: 58, y: 88, expect: 0 }, { x: 70, y: 88, expect: 0 }, { x: 82, y: 88, expect: 255 }
        ]
        
        this.rttex = rttex.rttexHeader;
        this.pixels = rttex.rawData(true);
        this.pixelsFiltered = new Uint8Array(this.rttex.height * this.rttex.width);
        this.filterDistance = 16;
    }

    solve() {
        for (let i = 0; i < this.pixelsFiltered.length; i++) {
            let x = i % this.rttex.width;
            let y = Math.floor(i / this.rttex.width);

            let bytesPerPixel = this.rttex.usesAlpha ? 4 : 3;
            let address = ((y * this.rttex.width) * bytesPerPixel) + (x) * bytesPerPixel;
            let addressUp = (((y - 1) * this.rttex.width) * bytesPerPixel) + (x) * bytesPerPixel;
            let addressRight = ((y * this.rttex.width) * bytesPerPixel) + (x + 1) * bytesPerPixel;
            let addressBottom = (((y + 1) * this.rttex.width) * bytesPerPixel) + (x) * bytesPerPixel;
            let addressLeft = ((y * this.rttex.width) * bytesPerPixel) + (x - 1) * bytesPerPixel;

            let filter = 0;
            for (let j = 0; j < 3; j++) {
                if (Math.abs(this.pixels[address + j] - this.pixels[addressRight + j]) > this.filterDistance ||
                    Math.abs(this.pixels[address + j] - this.pixels[addressBottom + j]) > this.filterDistance ||
                    Math.abs(this.pixels[address + j] - this.pixels[addressLeft + j]) > this.filterDistance ||
                    Math.abs(this.pixels[address + j] - this.pixels[addressUp + j]) > this.filterDistance) {
                    filter = 1;
                }
            }

            if (this.pixels[address + 0] >= 200 && this.pixels[address + 1] >= 200 && this.pixels[address + 2] >= 200) {
                if (this.pixels[address + 0] != 255 && this.pixels[address + 1] != 255 && this.pixels[address + 2] != 255) {
                    filter = 0;
                }
            }

            this.pixelsFiltered[i] = filter;
        }

        let score = 0;
        let best = {
            x: 0,
            y: 0,
            score: 0
        };

        for (let i = 0; i < this.pixelsFiltered.length; i++) {
            let x = i % this.rttex.width;
            let y = Math.floor(i / this.rttex.width);

            score = 0;
            for (let j = 0; j < this.check.length; j++) {
                let address = ((y + this.check[j].y) * this.rttex.width) + (x + this.check[j].x);
                let expect = (this.check[j].expect == 255) ? 0 : 1;
                if (this.pixelsFiltered[address] == expect) {
                    score++;
                }
            }

            if (score >= best.score) {
                best.score = score;
                best.x = x;
                best.y = y;
            }
        }

        return { x: best.x, y: best.y }
    }
}

function main() {
    const axiosRequest = axios.create({
        responseType: "arraybuffer",
        baseURL: url,
        headers: {
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=1500, max=100"
        }
    });

    const end = (res, responseText) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.write(responseText ? responseText : "Hello, world!");
        res.end();
    }

    http.createServer(async (req, res) => {
        if (!req.url.startsWith("/api")) {
            end(res);
            return;
        }

        const queryObject = url.parse(req.url, true).query;
        if (typeof queryObject.type !== "string") {
            end(res, "failed");
            return;
        }

        if (queryObject.type !== "puzzlecaptchasolver") {
            end(res, "failed");
            return;
        }

        if (typeof queryObject.uuid !== "string") {
            end(res, "failed");
            return;
        }

        if (!queryObject.uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
            end(res, "failed");
            return;
        }

        let apiResponse = "failed";

        console.log(`Request puzzle: ${queryObject.uuid}`);
        let startGetData = Date.now();
        await axiosRequest.get(`https://ubistatic-a.akamaihd.net/0098/captcha/generated/${queryObject.uuid}-PuzzleWithMissingPiece.rttex`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5097.0 Safari/537.36"
                }
            })
            .then(async response => {
                let endGotData = Date.now();
                console.log(`Got puzzle: ${queryObject.uuid} in ${endGotData - startGetData}ms`);

                let buffer = Buffer.from(response.data, "binary");
                let rttex = new RTTEX(buffer);
                let solve = new PuzzleCaptchaSolver(rttex);
                
                let startSolving = Date.now();
                apiResponse = (solve.solve().x / rttex.rttexHeader.width).toString();
                console.log(`Puzzle answer: ${queryObject.uuid} position ${apiResponse}`);

                let endSolving = Date.now();
                console.log(`Solved puzzle: ${queryObject.uuid} in ${endSolving - startSolving}ms`);
            })
            .catch(_ => {
                console.log(`Failed to get puzzle: ${queryObject.uuid}`);
            });
        
        end(res, apiResponse);
    }).listen(process.env.PORT || 3000);

    console.log(`Server running at http://localhost:${process.env.PORT || 3000}/`);
}

main();
