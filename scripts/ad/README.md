# Home page film (public/home/ad)

`ad.html` is the whole 47-second film as one HTML page: `render(t)` draws
the frame at time `t`. `frames.cjs all` saves 30 frames a second, then:

    ffmpeg -framerate 30 -i frames/f%05d.jpg -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart magical-touch-ad.mp4

It expects `img/` (business photos: StockSnap, CC0; cut-outs made with the
site's own background remover; logo) and `fonts/` (Poppins, Inter,
Noto Sans Arabic / Devanagari / JP) next to it.
