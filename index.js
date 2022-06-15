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

    async rawData(flipVertical = false) {
        if (this.rttexHeader.format != 5121) {
            return null;
        }

        let posBefore = this.pos;
        for (let i = 0; i < this.rttexHeader.mipmapCount; i++) {
            let mipHeader = new RTTEXMipHeader();
            this.pos = mipHeader.serialize(this.buffer, this.pos);
            let mipData = this.buffer.subarray(this.pos, this.pos + mipHeader.dataSize);

            this.pos = posBefore;
            
            if (flipVertical) {
                return new Promise(resolve => {
                    new jimp(mipHeader.width, mipHeader.height, (err, image) => {
                        if (err) throw err;
                        
                        image.bitmap.data.set(mipData);
                        image.flip(false, true);
                        resolve(image.bitmap.data);
                    });
                });
            }
        
            return mipData;
        }

        return null;
    }

    async write(path, flipVertical = true) {
        return new Promise(resolve => {
            new jimp(this.rttexHeader.width, this.rttexHeader.height, (err, image) => {
                if (err) throw err;
                
                image.bitmap.data.set(this.rawData());
                image.flip(false, flipVertical);
                image.write(path);
                resolve(true);
            });

            resolve(false);
        });
    }
}

class PuzzleCaptchaSolver {
    constructor(rttex) {
        this.check = [
            // White, Semi transparent, and semi transparent v2 algorithm.
            { x: 11, y: 0, expect: 255 }, { x: 35, y: 1, expect: 0 }, { x: 47, y: 1, expect: 255 }, { x: 27, y: 3, expect: 0 }, { x: 39, y: 3, expect: 255 }, { x: 24, y: 6, expect: 0 }, { x: 36, y: 6, expect: 255 }, { x: 45, y: 10, expect: 0 }, { x: 57, y: 10, expect: 255 }, { x: 30, y: 13, expect: 0 }, { x: 42, y: 13, expect: 0 }, { x: 54, y: 13, expect: 255 }, { x: 66, y: 13, expect: 255 }, { x: 26, y: 17, expect: 0 }, { x: 38, y: 17, expect: 255 }, { x: 10, y: 18, expect: 0 }, { x: 22, y: 18, expect: 0 }, { x: 34, y: 18, expect: 255 }, { x: 46, y: 18, expect: 0 }, { x: 58, y: 18, expect: 0 }, { x: 70, y: 18, expect: 0 }, { x: 82, y: 18, expect: 255 }, { x: 5, y: 19, expect: 0 }, { x: 17, y: 19, expect: 0 }, { x: 29, y: 19, expect: 255 }, { x: 41, y: 19, expect: 255 }, { x: 53, y: 19, expect: 0 }, { x: 65, y: 19, expect: 0 }, { x: 77, y: 19, expect: 255 }, { x: 0, y: 20, expect: 0 }, { x: 12, y: 20, expect: 255 }, { x: 24, y: 20, expect: 255 }, { x: 36, y: 20, expect: 255 }, { x: 48, y: 20, expect: 255 }, { x: 60, y: 20, expect: 255 }, { x: 1, y: 23, expect: 0 }, { x: 13, y: 23, expect: 255 }, { x: 72, y: 25, expect: 0 }, { x: 84, y: 25, expect: 255 }, { x: 71, y: 28, expect: 0 }, { x: 83, y: 28, expect: 255 }, { x: 71, y: 31, expect: 0 }, { x: 83, y: 31, expect: 255 }, { x: 71, y: 34, expect: 0 }, { x: 83, y: 34, expect: 255 }, { x: 71, y: 37, expect: 0 }, { x: 83, y: 37, expect: 255 }, { x: 71, y: 40, expect: 0 }, { x: 83, y: 40, expect: 0 }, { x: 6, y: 41, expect: 255 }, { x: 18, y: 41, expect: 255 }, { x: 0, y: 42, expect: 0 }, { x: 12, y: 42, expect: 0 }, { x: 24, y: 42, expect: 255 }, { x: 36, y: 42, expect: 255 }, { x: 1, y: 43, expect: 0 }, { x: 13, y: 43, expect: 0 }, { x: 25, y: 43, expect: 255 }, { x: 37, y: 43, expect: 255 }, { x: 10, y: 44, expect: 0 }, { x: 22, y: 44, expect: 255 }, { x: 10, y: 45, expect: 0 }, { x: 22, y: 45, expect: 255 }, { x: 2, y: 46, expect: 0 }, { x: 14, y: 46, expect: 255 }, { x: 88, y: 46, expect: 0 }, { x: 11, y: 47, expect: 255 }, { x: 3, y: 48, expect: 0 }, { x: 15, y: 48, expect: 255 }, { x: 18, y: 49, expect: 0 }, { x: 30, y: 49, expect: 255 }, { x: 87, y: 51, expect: 0 }, { x: 10, y: 52, expect: 255 }, { x: 19, y: 54, expect: 0 }, { x: 31, y: 54, expect: 255 }, { x: 18, y: 57, expect: 0 }, { x: 30, y: 57, expect: 255 }, { x: 3, y: 59, expect: 0 }, { x: 15, y: 59, expect: 255 }, { x: 17, y: 60, expect: 0 }, { x: 29, y: 60, expect: 255 }, { x: 8, y: 61, expect: 0 }, { x: 20, y: 61, expect: 255 }, { x: 16, y: 62, expect: 0 }, { x: 28, y: 62, expect: 255 }, { x: 15, y: 63, expect: 0 }, { x: 27, y: 63, expect: 255 }, { x: 14, y: 64, expect: 0 }, { x: 26, y: 64, expect: 255 }, { x: 13, y: 65, expect: 0 }, { x: 25, y: 65, expect: 255 }, { x: 70, y: 66, expect: 0 }, { x: 82, y: 66, expect: 0 }, { x: 5, y: 67, expect: 255 }, { x: 17, y: 67, expect: 255 }, { x: 30, y: 70, expect: 0 }, { x: 42, y: 70, expect: 255 }, { x: 0, y: 72, expect: 0 }, { x: 12, y: 72, expect: 255 }, { x: 45, y: 73, expect: 0 }, { x: 57, y: 73, expect: 255 }, { x: 24, y: 75, expect: 0 }, { x: 36, y: 75, expect: 255 }, { x: 23, y: 77, expect: 0 }, { x: 35, y: 77, expect: 255 }, { x: 1, y: 79, expect: 0 }, { x: 13, y: 79, expect: 255 }, { x: 28, y: 80, expect: 0 }, { x: 40, y: 80, expect: 255 }, { x: 1, y: 82, expect: 0 }, { x: 13, y: 82, expect: 255 }, { x: 30, y: 84, expect: 0 }, { x: 42, y: 84, expect: 255 }, { x: 41, y: 86, expect: 0 }, { x: 53, y: 86, expect: 255 }, { x: 43, y: 87, expect: 0 }, { x: 55, y: 87, expect: 255 }, { x: 10, y: 88, expect: 0 }, { x: 22, y: 88, expect: 0 }, { x: 34, y: 88, expect: 255 }, { x: 46, y: 88, expect: 0 }, { x: 58, y: 88, expect: 0 }, { x: 70, y: 88, expect: 0 }, { x: 82, y: 88, expect: 255 },
        ]
        this.chessBoardCheck = [
            // Chess board pattern algorithm.
            { x: 31, y: 0, expect: 0 }, { x: 63, y: 0, expect: 255 }, { x: 6, y: 1, expect: 255 }, { x: 38, y: 1, expect: 0 }, { x: 70, y: 1, expect: 255 }, { x: 13, y: 2, expect: 255 }, { x: 45, y: 2, expect: 0 }, { x: 77, y: 2, expect: 255 }, { x: 20, y: 3, expect: 255 }, { x: 52, y: 3, expect: 255 }, { x: 84, y: 3, expect: 255 }, { x: 27, y: 4, expect: 0 }, { x: 59, y: 4, expect: 255 }, { x: 2, y: 5, expect: 255 }, { x: 34, y: 5, expect: 0 }, { x: 66, y: 5, expect: 255 }, { x: 9, y: 6, expect: 255 }, { x: 41, y: 6, expect: 0 }, { x: 73, y: 6, expect: 255 }, { x: 16, y: 7, expect: 255 }, { x: 48, y: 7, expect: 0 }, { x: 80, y: 7, expect: 255 }, { x: 23, y: 8, expect: 0 }, { x: 55, y: 8, expect: 255 }, { x: 87, y: 8, expect: 255 }, { x: 30, y: 9, expect: 0 }, { x: 62, y: 9, expect: 255 }, { x: 5, y: 10, expect: 255 }, { x: 37, y: 10, expect: 0 }, { x: 69, y: 10, expect: 255 }, { x: 12, y: 11, expect: 255 }, { x: 44, y: 11, expect: 0 }, { x: 76, y: 11, expect: 255 }, { x: 19, y: 12, expect: 255 }, { x: 51, y: 12, expect: 255 }, { x: 83, y: 12, expect: 255 }, { x: 26, y: 13, expect: 255 }, { x: 58, y: 13, expect: 255 }, { x: 1, y: 14, expect: 255 }, { x: 33, y: 14, expect: 0 }, { x: 65, y: 14, expect: 255 }, { x: 8, y: 15, expect: 255 }, { x: 40, y: 15, expect: 0 }, { x: 72, y: 15, expect: 255 }, { x: 15, y: 16, expect: 255 }, { x: 47, y: 16, expect: 255 }, { x: 79, y: 16, expect: 255 }, { x: 22, y: 17, expect: 255 }, { x: 54, y: 17, expect: 255 }, { x: 86, y: 17, expect: 0 }, { x: 29, y: 18, expect: 0 }, { x: 61, y: 18, expect: 0 }, { x: 4, y: 19, expect: 0 }, { x: 36, y: 19, expect: 0 }, { x: 68, y: 19, expect: 0 }, { x: 11, y: 20, expect: 0 }, { x: 43, y: 20, expect: 0 }, { x: 75, y: 20, expect: 255 }, { x: 18, y: 21, expect: 0 }, { x: 50, y: 21, expect: 0 }, { x: 82, y: 21, expect: 255 }, { x: 25, y: 22, expect: 0 }, { x: 57, y: 22, expect: 0 }, { x: 0, y: 23, expect: 0 }, { x: 32, y: 23, expect: 0 }, { x: 64, y: 23, expect: 0 }, { x: 7, y: 24, expect: 0 }, { x: 39, y: 24, expect: 0 }, { x: 71, y: 24, expect: 0 }, { x: 14, y: 25, expect: 0 }, { x: 46, y: 25, expect: 0 }, { x: 78, y: 25, expect: 255 }, { x: 21, y: 26, expect: 255 }, { x: 53, y: 26, expect: 0 }, { x: 85, y: 26, expect: 255 }, { x: 28, y: 27, expect: 0 }, { x: 60, y: 27, expect: 0 }, { x: 3, y: 28, expect: 0 }, { x: 35, y: 28, expect: 0 }, { x: 67, y: 28, expect: 0 }, { x: 10, y: 29, expect: 0 }, { x: 42, y: 29, expect: 0 }, { x: 74, y: 29, expect: 255 }, { x: 17, y: 30, expect: 255 }, { x: 49, y: 30, expect: 255 }, { x: 81, y: 30, expect: 255 }, { x: 24, y: 31, expect: 0 }, { x: 56, y: 31, expect: 255 }, { x: 88, y: 31, expect: 255 }, { x: 31, y: 32, expect: 255 }, { x: 63, y: 32, expect: 0 }, { x: 6, y: 33, expect: 0 }, { x: 38, y: 33, expect: 0 }, { x: 70, y: 33, expect: 0 }, { x: 13, y: 34, expect: 0 }, { x: 45, y: 34, expect: 0 }, { x: 77, y: 34, expect: 255 }, { x: 20, y: 35, expect: 0 }, { x: 52, y: 35, expect: 0 }, { x: 84, y: 35, expect: 255 }, { x: 27, y: 36, expect: 255 }, { x: 59, y: 36, expect: 255 }, { x: 2, y: 37, expect: 0 }, { x: 34, y: 37, expect: 0 }, { x: 66, y: 37, expect: 255 }, { x: 9, y: 38, expect: 0 }, { x: 41, y: 38, expect: 0 }, { x: 73, y: 38, expect: 255 }, { x: 16, y: 39, expect: 0 }, { x: 48, y: 39, expect: 0 }, { x: 80, y: 39, expect: 255 }, { x: 23, y: 40, expect: 0 }, { x: 55, y: 40, expect: 0 }, { x: 87, y: 40, expect: 255 }, { x: 30, y: 41, expect: 0 }, { x: 62, y: 41, expect: 0 }, { x: 5, y: 42, expect: 0 }, { x: 37, y: 42, expect: 255 }, { x: 69, y: 42, expect: 0 }, { x: 12, y: 43, expect: 0 }, { x: 44, y: 43, expect: 255 }, { x: 76, y: 43, expect: 255 }, { x: 19, y: 44, expect: 0 }, { x: 51, y: 44, expect: 0 }, { x: 83, y: 44, expect: 0 }, { x: 26, y: 45, expect: 0 }, { x: 58, y: 45, expect: 0 }, { x: 1, y: 46, expect: 0 }, { x: 33, y: 46, expect: 255 }, { x: 65, y: 46, expect: 255 }, { x: 8, y: 47, expect: 0 }, { x: 40, y: 47, expect: 0 }, { x: 72, y: 47, expect: 0 }, { x: 15, y: 48, expect: 255 }, { x: 47, y: 48, expect: 0 }, { x: 79, y: 48, expect: 0 }, { x: 22, y: 49, expect: 0 }, { x: 54, y: 49, expect: 0 }, { x: 86, y: 49, expect: 0 }, { x: 29, y: 50, expect: 0 }, { x: 61, y: 50, expect: 0 }, { x: 4, y: 51, expect: 255 }, { x: 36, y: 51, expect: 0 }, { x: 68, y: 51, expect: 0 }, { x: 11, y: 52, expect: 255 }, { x: 43, y: 52, expect: 255 }, { x: 75, y: 52, expect: 0 }, { x: 18, y: 53, expect: 0 }, { x: 50, y: 53, expect: 255 }, { x: 82, y: 53, expect: 255 }, { x: 25, y: 54, expect: 0 }, { x: 57, y: 54, expect: 0 }, { x: 0, y: 55, expect: 255 }, { x: 32, y: 55, expect: 0 }, { x: 64, y: 55, expect: 0 }, { x: 7, y: 56, expect: 255 }, { x: 39, y: 56, expect: 0 }, { x: 71, y: 56, expect: 0 }, { x: 14, y: 57, expect: 255 }, { x: 46, y: 57, expect: 0 }, { x: 78, y: 57, expect: 0 }, { x: 21, y: 58, expect: 0 }, { x: 53, y: 58, expect: 0 }, { x: 85, y: 58, expect: 0 }, { x: 28, y: 59, expect: 255 }, { x: 60, y: 59, expect: 255 }, { x: 3, y: 60, expect: 0 }, { x: 35, y: 60, expect: 0 }, { x: 67, y: 60, expect: 0 }, { x: 10, y: 61, expect: 0 }, { x: 42, y: 61, expect: 0 }, { x: 74, y: 61, expect: 0 }, { x: 17, y: 62, expect: 0 }, { x: 49, y: 62, expect: 0 }, { x: 81, y: 62, expect: 0 }, { x: 24, y: 63, expect: 0 }, { x: 56, y: 63, expect: 0 }, { x: 88, y: 63, expect: 0 }, { x: 31, y: 64, expect: 0 }, { x: 63, y: 64, expect: 0 }, { x: 6, y: 65, expect: 255 }, { x: 38, y: 65, expect: 0 }, { x: 70, y: 65, expect: 0 }, { x: 13, y: 66, expect: 0 }, { x: 45, y: 66, expect: 0 }, { x: 77, y: 66, expect: 255 }, { x: 20, y: 67, expect: 0 }, { x: 52, y: 67, expect: 0 }, { x: 84, y: 67, expect: 0 }, { x: 27, y: 68, expect: 0 }, { x: 59, y: 68, expect: 0 }, { x: 2, y: 69, expect: 0 }, { x: 34, y: 69, expect: 0 }, { x: 66, y: 69, expect: 0 }, { x: 9, y: 70, expect: 0 }, { x: 41, y: 70, expect: 0 }, { x: 73, y: 70, expect: 255 }, { x: 16, y: 71, expect: 0 }, { x: 48, y: 71, expect: 0 }, { x: 80, y: 71, expect: 255 }, { x: 23, y: 72, expect: 0 }, { x: 55, y: 72, expect: 0 }, { x: 87, y: 72, expect: 255 }, { x: 30, y: 73, expect: 0 }, { x: 62, y: 73, expect: 0 }, { x: 5, y: 74, expect: 0 }, { x: 37, y: 74, expect: 0 }, { x: 69, y: 74, expect: 0 }, { x: 12, y: 75, expect: 0 }, { x: 44, y: 75, expect: 0 }, { x: 76, y: 75, expect: 255 }, { x: 19, y: 76, expect: 0 }, { x: 51, y: 76, expect: 0 }, { x: 83, y: 76, expect: 255 }, { x: 26, y: 77, expect: 0 }, { x: 58, y: 77, expect: 0 }, { x: 1, y: 78, expect: 0 }, { x: 33, y: 78, expect: 255 }, { x: 65, y: 78, expect: 255 }, { x: 8, y: 79, expect: 0 }, { x: 40, y: 79, expect: 0 }, { x: 72, y: 79, expect: 0 }, { x: 15, y: 80, expect: 0 }, { x: 47, y: 80, expect: 0 }, { x: 79, y: 80, expect: 255 }, { x: 22, y: 81, expect: 255 }, { x: 54, y: 81, expect: 255 }, { x: 86, y: 81, expect: 0 }, { x: 29, y: 82, expect: 0 }, { x: 61, y: 82, expect: 0 }, { x: 4, y: 83, expect: 0 }, { x: 36, y: 83, expect: 255 }, { x: 68, y: 83, expect: 0 }, { x: 11, y: 84, expect: 0 }, { x: 43, y: 84, expect: 0 }, { x: 75, y: 84, expect: 0 }, { x: 18, y: 85, expect: 0 }, { x: 50, y: 85, expect: 0 }, { x: 82, y: 85, expect: 255 }, { x: 25, y: 86, expect: 0 }, { x: 57, y: 86, expect: 0 }, { x: 0, y: 87, expect: 255 }, { x: 32, y: 87, expect: 255 }, { x: 64, y: 87, expect: 0 }, { x: 7, y: 88, expect: 0 }, { x: 39, y: 88, expect: 255 }, { x: 71, y: 88, expect: 0 }, 
        ]
        this.yellowLineCheck = [
            // Yellow line algorithm.
            { x: 38, y: 1, expect: 0 }, { x: 29, y: 2, expect: 0 }, { x: 45, y: 2, expect: 0 }, { x: 36, y: 3, expect: 0 }, { x: 27, y: 4, expect: 0 }, { x: 43, y: 4, expect: 30 }, { x: 34, y: 5, expect: 30 }, { x: 50, y: 5, expect: 0 }, { x: 25, y: 6, expect: 0 }, { x: 41, y: 6, expect: 0 }, { x: 32, y: 7, expect: 0 }, { x: 48, y: 7, expect: 30 }, { x: 23, y: 8, expect: 0 }, { x: 55, y: 8, expect: 0 }, { x: 30, y: 9, expect: 0 }, { x: 53, y: 10, expect: 0 }, { x: 28, y: 11, expect: 30 }, { x: 51, y: 12, expect: 30 }, { x: 26, y: 13, expect: 0 }, { x: 33, y: 14, expect: 0 }, { x: 49, y: 14, expect: 30 }, { x: 24, y: 15, expect: 0 }, { x: 31, y: 16, expect: 30 }, { x: 47, y: 16, expect: 30 }, { x: 13, y: 18, expect: 0 }, { x: 29, y: 18, expect: 0 }, { x: 45, y: 18, expect: 0 }, { x: 61, y: 18, expect: 0 }, { x: 4, y: 19, expect: 0 }, { x: 20, y: 19, expect: 0 }, { x: 52, y: 19, expect: 0 }, { x: 68, y: 19, expect: 0 }, { x: 11, y: 20, expect: 0 }, { x: 27, y: 20, expect: 0 }, { x: 59, y: 20, expect: 0 }, { x: 75, y: 20, expect: 0 }, { x: 2, y: 21, expect: 0 }, { x: 18, y: 21, expect: 0 }, { x: 50, y: 21, expect: 0 }, { x: 66, y: 21, expect: 0 }, { x: 9, y: 22, expect: 30 }, { x: 25, y: 22, expect: 30 }, { x: 57, y: 22, expect: 30 }, { x: 73, y: 22, expect: 30 }, { x: 0, y: 23, expect: 0 }, { x: 16, y: 23, expect: 30 }, { x: 32, y: 23, expect: 0 }, { x: 48, y: 23, expect: 0 }, { x: 64, y: 23, expect: 30 }, { x: 7, y: 24, expect: 0 }, { x: 23, y: 24, expect: 0 }, { x: 55, y: 24, expect: 0 }, { x: 71, y: 24, expect: 0 }, { x: 78, y: 25, expect: 0 }, { x: 5, y: 26, expect: 30 }, { x: 3, y: 28, expect: 0 }, { x: 74, y: 29, expect: 30 }, { x: 1, y: 30, expect: 0 }, { x: 72, y: 31, expect: 0 }, { x: 6, y: 33, expect: 0 }, { x: 77, y: 34, expect: 0 }, { x: 4, y: 35, expect: 30 }, { x: 75, y: 36, expect: 0 }, { x: 2, y: 37, expect: 0 }, { x: 73, y: 38, expect: 30 }, { x: 0, y: 39, expect: 0 }, { x: 78, y: 41, expect: 0 }, { x: 5, y: 42, expect: 30 }, { x: 85, y: 42, expect: 0 }, { x: 3, y: 44, expect: 0 }, { x: 19, y: 44, expect: 0 }, { x: 83, y: 44, expect: 0 }, { x: 74, y: 45, expect: 30 }, { x: 1, y: 46, expect: 0 }, { x: 17, y: 46, expect: 30 }, { x: 81, y: 46, expect: 0 }, { x: 72, y: 47, expect: 0 }, { x: 88, y: 47, expect: 30 }, { x: 15, y: 48, expect: 0 }, { x: 79, y: 48, expect: 0 }, { x: 6, y: 49, expect: 30 }, { x: 22, y: 49, expect: 0 }, { x: 13, y: 50, expect: 30 }, { x: 77, y: 50, expect: 30 }, { x: 20, y: 51, expect: 0 }, { x: 11, y: 52, expect: 30 }, { x: 18, y: 53, expect: 0 }, { x: 9, y: 54, expect: 0 }, { x: 23, y: 56, expect: 30 }, { x: 21, y: 58, expect: 0 }, { x: 12, y: 59, expect: 0 }, { x: 3, y: 60, expect: 0 }, { x: 19, y: 60, expect: 0 }, { x: 10, y: 61, expect: 0 }, { x: 1, y: 62, expect: 0 }, { x: 17, y: 62, expect: 0 }, { x: 8, y: 63, expect: 30 }, { x: 24, y: 63, expect: 0 }, { x: 15, y: 64, expect: 0 }, { x: 79, y: 64, expect: 30 }, { x: 6, y: 65, expect: 0 }, { x: 22, y: 65, expect: 0 }, { x: 13, y: 66, expect: 30 }, { x: 77, y: 66, expect: 0 }, { x: 4, y: 67, expect: 30 }, { x: 20, y: 67, expect: 0 }, { x: 84, y: 67, expect: 0 }, { x: 75, y: 68, expect: 0 }, { x: 2, y: 69, expect: 0 }, { x: 18, y: 69, expect: 0 }, { x: 82, y: 69, expect: 30 }, { x: 73, y: 70, expect: 30 }, { x: 0, y: 71, expect: 0 }, { x: 80, y: 71, expect: 0 }, { x: 39, y: 72, expect: 0 }, { x: 87, y: 72, expect: 0 }, { x: 46, y: 73, expect: 0 }, { x: 78, y: 73, expect: 0 }, { x: 5, y: 74, expect: 30 }, { x: 44, y: 75, expect: 30 }, { x: 3, y: 76, expect: 0 }, { x: 35, y: 76, expect: 0 }, { x: 42, y: 77, expect: 0 }, { x: 74, y: 77, expect: 30 }, { x: 1, y: 78, expect: 0 }, { x: 33, y: 78, expect: 0 }, { x: 49, y: 78, expect: 30 }, { x: 72, y: 79, expect: 0 }, { x: 31, y: 80, expect: 0 }, { x: 47, y: 80, expect: 0 }, { x: 6, y: 81, expect: 0 }, { x: 29, y: 82, expect: 30 }, { x: 45, y: 82, expect: 0 }, { x: 77, y: 82, expect: 0 }, { x: 4, y: 83, expect: 30 }, { x: 36, y: 83, expect: 0 }, { x: 43, y: 84, expect: 0 }, { x: 75, y: 84, expect: 0 }, { x: 2, y: 85, expect: 0 }, { x: 34, y: 85, expect: 30 }, { x: 41, y: 86, expect: 0 }, { x: 73, y: 86, expect: 30 }, { x: 0, y: 87, expect: 0 }, { x: 32, y: 87, expect: 0 }, 
        ]
        
        this.rttex = rttex.rttexHeader;
        this.rttexData = rttex;
        this.pixels = null;
        this.pixelsFiltered = new Uint8Array(this.rttex.height * this.rttex.width);
        this.filterDistance = 16;
        this.yellowLineCount = 0;
    }

    async loadAllPixel() {
        return new Promise(async (resolve, reject) => {
            this.pixels = await this.rttexData.rawData(true);
            resolve();
        });
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

            if ((this.pixels[address + 0] >= 200 && this.pixels[address + 1] >= 200 && this.pixels[address + 2] >= 200) &&
                (this.pixels[address + 0] !== 255 && this.pixels[address + 1] !== 255 && this.pixels[address + 2] !== 255)) {
                filter = 0;
            }

            // Detect yellow.
            let r = this.pixels[address + 0] > 215;
            let g = Math.abs(this.pixels[address + 1] - this.pixels[address + 0]) < 3;
            let b = this.pixels[address + 2] >= 30 && this.pixels[address + 2] < 50;
            if (r && g && b) {
                if (filter === 1) {
                    this.yellowLineCount++;
                    filter = 2;
                }
            }

            this.pixelsFiltered[i] = filter;
        }

        let score = 0;
        let scoreChessBoard = 0;
        let best = {
            x: 0,
            y: 0,
            score: 0
        };

        for (let i = 0; i < this.pixelsFiltered.length; i++) {
            let x = i % this.rttex.width;
            let y = Math.floor(i / this.rttex.width);

            score = 0;
            scoreChessBoard = 0;
            if (this.yellowLineCount > 512) {
                for (let j = 0; j < this.yellowLineCheck.length; j++) {
                    let address = ((y + this.yellowLineCheck[j].y) * this.rttex.width) + (x + this.yellowLineCheck[j].x);
                    let expect = (this.yellowLineCheck[j].expect === 0) ? 1 : 2;
                    if (this.pixelsFiltered[address] === expect) {
                        score++;
                    }
                }
            }
            else {
                let length = this.check.length;
                if (this.chessBoardCheck.length > length) {
                    length = this.chessBoardCheck.length;
                }
                
                for (let j = 0; j < length; j++) {
                    if (j < this.check.length) {
                        let address = ((y + this.check[j].y) * this.rttex.width) + (x + this.check[j].x);
                        let expect = (this.check[j].expect === 255) ? 0 : 1;
                        if (this.pixelsFiltered[address] === expect) {
                            score++;
                        }
                    }
                    if (j < this.chessBoardCheck.length) {
                        let address = ((y + this.chessBoardCheck[j].y) * this.rttex.width) + (x + this.chessBoardCheck[j].x);
                        let expect = (this.chessBoardCheck[j].expect === 255) ? 0 : 1;
                        if (this.pixelsFiltered[address] === expect) {
                            scoreChessBoard++;
                        }
                        else {
                            // Yes we safe to minus the score.
                            scoreChessBoard--;
                        }
                    }
                }

                if (scoreChessBoard > score) {
                    score = scoreChessBoard;
                }
            }

            if (score > best.score) {
                best.score = score;
                best.x = x;
                best.y = y;
            }
        }

        return { x: best.x, y: best.y }
    }
}

async function main() {
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
                let puzzleCaptchaSolver = new PuzzleCaptchaSolver(rttex);

                await puzzleCaptchaSolver.loadAllPixel();
                
                let startSolving = Date.now();
                apiResponse = (puzzleCaptchaSolver.solve().x / rttex.rttexHeader.width).toString();
                console.log(`Puzzle answer: ${queryObject.uuid} position ${apiResponse}`);

                let endSolving = Date.now();
                console.log(`Solved puzzle: ${queryObject.uuid} in ${endSolving - startSolving}ms`);
            })
            .catch(ex => {
                console.log(`Failed to get puzzle: ${queryObject.uuid}`);
                console.log(`${ex}`);
            });
        
        end(res, apiResponse);
    }).listen(process.env.PORT || 3000);

    console.log(`Server running at http://localhost:${process.env.PORT || 3000}/`);
}

main();
