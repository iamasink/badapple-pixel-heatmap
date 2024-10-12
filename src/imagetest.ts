const { createCanvas } = require('canvas') // Ensure you have the canvas package installed

import fs from "fs"
import { rgb, oklch, converter, Rgb } from "culori"

// Function to map normalized value to RGB colors (produces a nice gradient)
// function getColorFromValue(value: number) {
//     const z = value / 255

//     let r, g, b

//     // if (normalizedValue <= 0.25) {
//     //     r = Math.floor(4 * normalizedValue * 255)
//     //     g = 0
//     //     b = 255
//     // } else if (normalizedValue <= 0.5) {
//     //     r = 255
//     //     g = Math.floor(4 * (normalizedValue - 0.25) * 255)
//     //     b = Math.floor(255 * (1 - 4 * (normalizedValue - 0.25)))
//     // } else if (normalizedValue <= 0.75) {
//     //     r = Math.floor(255 * (1 - 4 * (normalizedValue - 0.5)))
//     //     g = 255
//     //     b = 0
//     // } else {
//     //     r = Math.floor(1 - 4 * normalizedValue * 255)
//     //     g = Math.floor(255 * (1 - 4 * (normalizedValue - 0.75)))
//     //     b = Math.floor(1 - 4 * normalizedValue * 255)
//     // }
//     function format(value: number) {
//         return Math.floor(value * 255)
//     }
//     let convertToRGB = converter('rgb')
//     let colour = convertToRGB({ mode: 'oklch', l: 1, c: 0.4, h: z * 360 })
//     // console.log(colour)

//     return { r: Math.min(255, Math.max(0, format(colour.r))), g: Math.min(255, Math.max(0, format(colour.g))), b: Math.min(255, Math.max(0, format(colour.b))) }
// }
function getColorFromValue(value: number) {
    const z = value / 255

    let r, g, b
    function format(value: number) {
        return Math.floor(value * 255)
    }



    ////////
    // if (normalizedValue <= 0.25) {
    //     r = Math.floor(4 * normalizedValue * 255)
    //     g = 0
    //     b = 255
    // } else if (normalizedValue <= 0.5) {
    //     r = 255
    //     g = Math.floor(4 * (normalizedValue - 0.25) * 255)
    //     b = Math.floor(255 * (1 - 4 * (normalizedValue - 0.25)))
    // } else if (normalizedValue <= 0.75) {
    //     r = Math.floor(255 * (1 - 4 * (normalizedValue - 0.5)))
    //     g = 255
    //     b = 0
    // } else {
    //     r = Math.floor(1 - 4 * normalizedValue * 255)
    //     g = Math.floor(255 * (1 - 4 * (normalizedValue - 0.75)))
    //     b = Math.floor(1 - 4 * normalizedValue * 255)
    // }
    /////////

    let convertToRGB = converter('rgb')
    // use the oklch colour space to produce a full-spectrum gradient
    // lightness (1), chroma (0.4), hue (360)
    let colour = convertToRGB({ mode: 'oklch', l: 0.65, c: 0.35, h: z * 360 })
    // console.log(colour)

    return { r: Math.min(255, Math.max(0, format(colour.r))), g: Math.min(255, Math.max(0, format(colour.g))), b: Math.min(255, Math.max(0, format(colour.b))) }

    ///////
    // if (z <= 0.5) {
    //     let val = 1.5 * (z)
    //     r = val
    //     g = val
    //     b = val

    // } else {
    //     let val = 0.75 + ((z - 0.5) / 2)
    //     r = val
    //     g = val
    //     b = val


    // }
    // return { r: Math.min(255, Math.max(0, format(r))), g: Math.min(255, Math.max(0, format(g))), b: Math.min(255, Math.max(0, format(b))) }


    //////
}


function createGradientTestImage() {
    const width = 256
    const height = 50
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    for (let x = 0; x < width; x++) {
        const color = getColorFromValue(x) // Get the color for the current x value
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`
        ctx.fillRect(x, 0, 1, height) // Draw a vertical line of 1 pixel
    }

    const buffer = canvas.toBuffer('image/png')
    fs.writeFileSync('gradient_test.png', buffer)
    console.log('Gradient test image created as gradient_test.png')
}

createGradientTestImage()
