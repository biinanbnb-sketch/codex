import AppKit

// Original bracket-and-cursor icon. No OpenAI application artwork is bundled.
let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
for size in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let pixels = size * scale
        let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        let context = NSGraphicsContext(bitmapImageRep: bitmap)!
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = context
        context.cgContext.scaleBy(x: CGFloat(pixels) / 512, y: CGFloat(pixels) / 512)
        NSColor(calibratedRed: 0.016, green: 0.028, blue: 0.043, alpha: 1).setFill()
        NSBezierPath(roundedRect: NSRect(x: 20, y: 20, width: 472, height: 472), xRadius: 108, yRadius: 108).fill()
        NSColor(calibratedRed: 0.247, green: 0.847, blue: 1, alpha: 1).setStroke()
        let brackets = NSBezierPath()
        brackets.lineWidth = 24
        brackets.move(to: NSPoint(x: 194, y: 350)); brackets.line(to: NSPoint(x: 108, y: 256)); brackets.line(to: NSPoint(x: 194, y: 162))
        brackets.move(to: NSPoint(x: 318, y: 350)); brackets.line(to: NSPoint(x: 404, y: 256)); brackets.line(to: NSPoint(x: 318, y: 162))
        brackets.stroke()
        NSColor(calibratedRed: 0.90, green: 0.97, blue: 1, alpha: 1).setFill()
        NSBezierPath(rect: NSRect(x: 236, y: 192, width: 40, height: 128)).fill()
        NSGraphicsContext.restoreGraphicsState()
        let suffix = scale == 2 ? "@2x" : ""
        let file = output.appendingPathComponent("icon_\(size)x\(size)\(suffix).png")
        try bitmap.representation(using: .png, properties: [:])!.write(to: file)
    }
}
