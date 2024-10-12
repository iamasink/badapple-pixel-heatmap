import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { createCanvas, loadImage } from 'canvas'
import { rgb, oklch, converter, Rgb } from "culori"

let width: number
let height: number
let frameRate: number

// Define paths
const inputVideoPath = '../badapple.mp4'
const outputDir = 'output'
const framesOutputDir = 'output/frames' // extracted frames
const processedFramesDir = 'output/processed_frames' // processed frames
const outputVideoPath = 'output/result.mp4' // Final video output
const outputVideoPathWithAudio = 'output/result2.mp4'

// Define the number of frames to process
const FRAMES_TO_PROCESS = 1000 // Change this value to process a different number of frames, dont worry if setting too high
const MAX_DURATION = 300 // clamp the value of maximum pixel time to this value

// First get metadata - width, height, frameRate
async function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; frameRate: number }> {
    return new Promise((resolve, reject) => {
        console.log(`Getting video metadata from ${videoPath}...`)
        ffmpeg.ffprobe(videoPath, (err: any, metadata: { streams: any[] }) => {
            if (err) {
                reject(err)
            } else {
                const videoStream = metadata.streams.find(stream => stream.codec_type === 'video')
                if (!videoStream) {
                    reject(new Error('No video stream found'))
                } else {
                    width = videoStream.width
                    height = videoStream.height
                    const frameRateString = videoStream.r_frame_rate
                    const [numerator, denominator] = frameRateString.split('/').map(Number)
                    frameRate = numerator / denominator

                    console.log(`Video width: ${width}, height: ${height}, frameRate: ${frameRate}`)
                    resolve({ width, height, frameRate })
                }
            }
        })
    })
}

// init 2d array for pixel duration
let pixelDuration: number[][] = []

// extract every frame from video using ffmpeg
async function extractFramesFromVideo(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Extracting frames from ${inputVideoPath}...`)
        if (!fs.existsSync(framesOutputDir)) {
            fs.mkdirSync(framesOutputDir, { recursive: true })
        }

        ffmpeg(inputVideoPath)
            .on('end', () => {
                console.log('Frame extraction completed successfully.')
                resolve()
            })
            .on('error', (err) => {
                console.error('Error during frame extraction:', err)
                reject(err)
            })
            .output(`${framesOutputDir}/frame_%04d.png`)
            .run()
    })
}

// Process frames
async function processFramesAndCreateNewFrames(): Promise<void> {
    // first, find the maximum pixel duration.
    console.log("First running through frames to calculate maximum value for normalisation")
    let maxDuration = 0
    let maxDurationAt = 0

    const frameFiles = fs.readdirSync(framesOutputDir).filter(f => f.endsWith('.png'))
    console.log(`Found ${frameFiles.length} frames to process.`)

    // Limit by frames if lower than video length (for quick test)
    const framesToProcess = Math.min(FRAMES_TO_PROCESS, frameFiles.length)
    console.log(`Processing up to ${framesToProcess} frames...`)

    // Initialise the pixelDuration array!
    let pixelDuration: number[][]
    pixelDuration = new Array(width).fill(0).map(() => new Array(height).fill(0))
    let previousFrame: Uint8ClampedArray | null = null

    // // Create the processed frames directory
    // if (!fs.existsSync(processedFramesDir)) {
    //     fs.mkdirSync(processedFramesDir, { recursive: true })
    // }

    // process each frame
    for (let i = 1; i <= framesToProcess; i++) {
        const framePath = `${framesOutputDir}/frame_${i.toString().padStart(4, '0')}.png`

        // only log intermittently
        if (i % 250 === 0)
            console.log(`Processing frame ${i} of ${framesToProcess}: ${framePath}...`)

        const img = await loadImage(framePath)
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const currentFrame = ctx.getImageData(0, 0, width, height).data

        if (previousFrame) {
            // Compare each pixel with the previous frame
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4

                    // Check if the pixel is the same
                    const samePixel =
                        currentFrame[index] === previousFrame[index] &&
                        currentFrame[index + 1] === previousFrame[index + 1] &&
                        currentFrame[index + 2] === previousFrame[index + 2]
                    // next is alpha, ignore it

                    // Increment the duration counter if the pixel is the same
                    pixelDuration[x][y] = samePixel ? pixelDuration[x][y] + 1 : 0 // Reset if the pixel changes
                    if (pixelDuration[x][y] > maxDuration) {
                        maxDuration = pixelDuration[x][y]
                        maxDurationAt = i
                    }
                    // save to frames variable
                    // frames[i][x][y] = pixelDuration[x][y]
                }
            }
        }
        previousFrame = new Uint8ClampedArray(currentFrame) // Clone current frame to be previous
    }

    // clear previousFrame and pixelduration
    previousFrame = null
    pixelDuration = new Array(width).fill(0).map(() => new Array(height).fill(0))


    console.log("Found maxDuration of " + maxDuration + " at " + maxDurationAt)
    if (maxDuration > MAX_DURATION) {
        console.log("setting maxDuration overridden lower to " + MAX_DURATION)
        maxDuration = MAX_DURATION
    }
    console.log("Now processing frames and creating output frames")


    // create new frames
    for (let i = 1; i <= framesToProcess; i++) {
        const framePath = `${framesOutputDir}/frame_${i.toString().padStart(4, '0')}.png`


        if (i % 250 === 0)
            console.log(`2 Processing frame ${i} of ${framesToProcess}: ${framePath}...`)

        const img = await loadImage(framePath)
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const currentFrame = ctx.getImageData(0, 0, width, height).data

        const newCanvas = createCanvas(width, height)
        const newCtx = newCanvas.getContext('2d')
        const imageData = newCtx.createImageData(width, height)

        if (previousFrame) {
            // Compare each pixel with the previous frame
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4

                    // Check if the pixel is the same
                    const samePixel =
                        currentFrame[index] === previousFrame[index] &&
                        currentFrame[index + 1] === previousFrame[index + 1] &&
                        currentFrame[index + 2] === previousFrame[index + 2]
                    // next is alpha, ignore it


                    // Increment the duration counter if the pixel is the same
                    pixelDuration[x][y] = samePixel ? pixelDuration[x][y] + 1 : 0 // Reset if the pixel changes
                    const duration = pixelDuration[x][y]

                    // normalise duration based on the maximum duration
                    const normalisedValue = maxDuration > 0 ? Math.min(255, (duration / maxDuration) * 255) : 0

                    // make it a nice colour
                    const color = getColorFromValue(normalisedValue)

                    // Set the RGB values in imageData
                    imageData.data[index] = color.r     // R
                    imageData.data[index + 1] = color.g // G
                    imageData.data[index + 2] = color.b // B
                    imageData.data[index + 3] = 255      // Alpha
                }
            }
        }

        newCtx.putImageData(imageData, 0, 0)

        // Save the processed frame
        const frameOutputPath = `${processedFramesDir}/processed_frame_${i.toString().padStart(4, '0')}.png`
        const buffer = newCanvas.toBuffer('image/png')
        fs.writeFileSync(frameOutputPath, buffer)
        // console.log(`Saved processed frame ${i} to ${frameOutputPath}`)

        previousFrame = new Uint8ClampedArray(currentFrame) // Clone current frame to be previous
    }
    console.log('Frame processing and new frame creation completed successfully.')
}



function getColorFromValue(value: number) {
    const z = value / 255

    let r, g, b
    function format(value: number) {
        return Math.floor(value * 255)
    }



    ////////
    // // if (normalizedValue <= 0.25) {
    // //     r = Math.floor(4 * normalizedValue * 255)
    // //     g = 0
    // //     b = 255
    // // } else if (normalizedValue <= 0.5) {
    // //     r = 255
    // //     g = Math.floor(4 * (normalizedValue - 0.25) * 255)
    // //     b = Math.floor(255 * (1 - 4 * (normalizedValue - 0.25)))
    // // } else if (normalizedValue <= 0.75) {
    // //     r = Math.floor(255 * (1 - 4 * (normalizedValue - 0.5)))
    // //     g = 255
    // //     b = 0
    // // } else {
    // //     r = Math.floor(1 - 4 * normalizedValue * 255)
    // //     g = Math.floor(255 * (1 - 4 * (normalizedValue - 0.75)))
    // //     b = Math.floor(1 - 4 * normalizedValue * 255)
    // // }

    // let convertToRGB = converter('rgb')
    // // use the oklch colour space to produce a full-spectrum gradient
    // // lightness (1), chroma (0.4), hue (360)
    // let colour = convertToRGB({ mode: 'oklch', l: 1, c: 0.4, h: z * 360 })
    // // console.log(colour)

    // return { r: Math.min(255, Math.max(0, format(colour.r))), g: Math.min(255, Math.max(0, format(colour.g))), b: Math.min(255, Math.max(0, format(colour.b))) }

    ///////

    let val = z
    r = val
    g = val
    b = val

    return { r: Math.min(255, Math.max(0, format(r))), g: Math.min(255, Math.max(0, format(g))), b: Math.min(255, Math.max(0, format(b))) }


    //////
}


// Combine new frames into a video with ffmpeg
async function combineFramesIntoVideo(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`Combining processed frames into video at ${outputVideoPath}...`)
        ffmpeg(`${processedFramesDir}/processed_frame_%04d.png`)
            .inputFPS(frameRate)
            .outputFPS(frameRate)
            .on('end', () => {
                console.log('Video creation finished successfully.')
                resolve()
            })
            .on('error', (err) => {
                console.error('Error during video creation:', err)
                reject(err)
            })
            .output(outputVideoPath)
            .run()
    })
}

// clear directory and contents
function clearDirectory(directoryPath: string): void {
    if (fs.existsSync(directoryPath)) {
        const files = fs.readdirSync(directoryPath)
        if (files.length > 0) {
            files.forEach(file => {
                const filePath = `${directoryPath}/${file}`
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath) // Remove each file
                }
            })
            console.log(`Cleared the contents of the directory: ${directoryPath}`)
        } else {
            console.log(`Directory is already empty: ${directoryPath}`)
        }
    } else {
        fs.mkdirSync(directoryPath, { recursive: true }) // Create directory if it doesn't exist
        console.log(`Created directory: ${directoryPath}`)
    }
}


// copy audio from one file and add to video of another
function copyAudio(videoFile: string, audioFile: string): void {
    if (!fs.existsSync(videoFile)) {
        console.log(`${videoFile} doesn't exist!`)
        return
    }
    if (!fs.existsSync(audioFile)) {
        console.log(`${audioFile} doesn't exist!`)
        return
    }
    ffmpeg()
        .input(videoFile) // video stream
        .input(audioFile) // audio stream
        .outputOptions([
            '-c copy',               // Copy streams without re-encoding
            '-map 0:v:0',           // Select video stream from first input
            '-map 1:a:0',           // Select audio stream from second input
            '-shortest'             // Stop when shortest stream ends
        ])
        .save(outputVideoPathWithAudio)      // Save to output path
        .on('end', () => {
            console.log('Processing finished successfully. Output saved to:', outputVideoPathWithAudio)
        })
        .on('error', (err) => {
            console.error('Error occurred during processing:', err.message)
        })

}

// Main function
(async () => {
    // whether to re-extract all frames from video??
    const reextract = false

    try {
        clearDirectory(processedFramesDir)
        await getVideoMetadata(inputVideoPath)

        if (reextract) {
            if (fs.existsSync(outputVideoPath)) {
                try {
                    fs.unlinkSync(outputVideoPath)
                    console.log("Successfully deleted the result video.")
                } catch (error) {
                    console.log("Couldn't delete result:", error)
                }
            } else {
                console.log("The result video does not exist.")
            }

            console.log('Extracting frames...')
            await extractFramesFromVideo()
        } else {
            console.log('Frames already extracted.')
        }

        console.log('Processing frames...')
        await processFramesAndCreateNewFrames()
        console.log('Combining processed frames into video...')
        await combineFramesIntoVideo()

        console.log('adding audio...')
        copyAudio(outputVideoPath, inputVideoPath)

        console.log("Done!")

    } catch (error) {
        console.error('Error during processing:', error)
    }
})()
