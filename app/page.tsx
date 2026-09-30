import BlackoutQR from "@/components/blackout-qr";

export default function Home() {
  return (
    <div className="wrap">
      <header className="mast">
        <div className="brand">
          <div className="glyph" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i className="o"></i><i></i><i></i><i></i><i></i>
          </div>
          <h1>Blackout QR</h1>
        </div>
        <p className="lede">
          QR codes that are mostly solid ink, or almost none, and still scan. Type a link, choose how hard to push
          it, and each result is read back by a real QR decoder before you can download it.
        </p>
      </header>

      <BlackoutQR />

      <section className="how">
        <h2>How a QR code gets this dark</h2>
        <div className="how-grid">
          <div>
            <h3>Filler chosen to cancel the mask</h3>
            <p>
              Every QR code flips its modules with one of eight fixed patterns. After your text ends, the leftover
              capacity is filled with bits that are the exact opposite of that pattern, so the flip turns them black.
            </p>
          </div>
          <div>
            <h3>Parity bits found by search</h3>
            <p>
              About a fifth of the modules are Reed–Solomon parity, computed from the data. They can&apos;t be set
              directly, so the app searches for filler whose parity also comes out black. The search keeps improving
              while you watch.
            </p>
          </div>
          <div>
            <h3>Codewords painted on purpose</h3>
            <p>
              The repair budget lets you paint the lightest codewords solid black. Readers treat them as damage and
              correct them. Every codeword you paint is one less a real smudge can hit, so leave some margin for print.
            </p>
          </div>
        </div>
        <p className="hint">
          Light mode runs the same three steps in reverse: filler that the mask turns white, parity searched toward
          white, and painted codewords left blank.
        </p>
        <p className="hint">
          A normal QR code is about half ink. Always test a scan on the phones you care about before printing,
          especially at high repair budgets.
        </p>
      </section>
    </div>
  );
}
