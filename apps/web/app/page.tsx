"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

const particles = Array.from({ length: 30 }, (_, i) => i);

const statusMessages = [
  "BUILT FOR THE PORTALDOT V3 TESTNET",
  "YOUR NEXT MOVE STARTS ON-CHAIN",
  "POWERING THE NEXT WAVE OF WEB3",
  "TEST. BUILD. DEPLOY. REPEAT.",
  "THE FUTURE IS BUILT ON-CHAIN",
  "ONE HUB. INFINITE POSSIBILITIES.",
];

function PotMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M40 8C40 8 17 34 17 49a23 23 0 0 0 46 0C63 34 40 8 40 8Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M29 50a11 11 0 0 0 11 11"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Arrow() {
  return <span aria-hidden="true" className={styles.arrow}>↗</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    let messageIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const message = statusMessages[messageIndex] ?? statusMessages[0] ?? "";

      if (!deleting) {
        charIndex++;
        setStatusText(message.slice(0, charIndex));

        if (charIndex >= message.length) {
          deleting = true;
          timeout = setTimeout(tick, 1400);
          return;
        }

        timeout = setTimeout(tick, 55);
      } else {
        charIndex--;
        setStatusText(message.slice(0, charIndex));

        if (charIndex <= 0) {
          deleting = false;
          messageIndex = (messageIndex + 1) % statusMessages.length;
          setStatusMessageIndex(messageIndex);
          timeout = setTimeout(tick, 180);
          return;
        }

        timeout = setTimeout(tick, 30);
      }
    };

    timeout = setTimeout(tick, 300);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handlePointer(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }

  function resetPointer() {
    setPointer({ x: 0, y: 0 });
  }

  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <div className={styles.backgroundGrid} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}>
        <Link href="/" className={styles.brand} aria-label="POT Starter Hub home">
          <span className={styles.brandSymbol}><PotMark /></span>
          <span className={styles.brandWords}>
            <strong>POT<span>.</span></strong>
            <small>STARTER HUB</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#experience">Experience</a>
          <a href="#how-it-works">How it works</a>
          <a
            href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide"
            target="_blank"
            rel="noreferrer"
          >
            Documentation <Arrow />
          </a>
        </nav>

        <Link href="/hub" className={styles.headerCta}>
          Launch app <Arrow />
        </Link>
      </header>

      <section
        className={styles.hero}
        id="experience"
        onMouseMove={handlePointer}
        onMouseLeave={resetPointer}
      >
        <div className={styles.heroCopy}>
          <div className={styles.statusLine}>
            <span className={styles.liveDot} />
            <span className={styles.statusText} aria-label={statusMessages[statusMessageIndex]}>{statusText}<span className={styles.srOnly}>{statusMessages[statusMessageIndex]}</span></span>
          </div>

          <h1 className={styles.headline}>
            Your next move
            <br />
            is <span className={styles.headlineAccent}>on-chain.</span>
          </h1>

          <p className={styles.heroDescription}>
            One place to get test tokens, prepare your wallet,
            and explore what you can build on Portaldot V3.
          </p>

          <div className={styles.heroActions}>
            <Link href="/hub" className={styles.primaryCta}>
              <span>Enter Starter Hub</span>
              <span className={styles.ctaArrow}><Arrow /></span>
            </Link>
            <a
              href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide"
              target="_blank"
              rel="noreferrer"
              className={styles.textCta}
            >
              Explore the guide <Arrow />
            </a>
          </div>

          <div className={styles.heroFootnote}>
            <span className={styles.checkIcon}>✓</span>
            <span>Testnet only. No mainnet value.</span>
          </div>

          <div className={styles.heroMetrics}>
            <div>
              <span className={styles.metricNumber}>01</span>
              <span className={styles.metricLabel}>Connect your wallet</span>
            </div>
            <span className={styles.metricDivider} />
            <div>
              <span className={styles.metricNumber}>02</span>
              <span className={styles.metricLabel}>Get test tokens</span>
            </div>
            <span className={styles.metricDivider} />
            <div>
              <span className={styles.metricNumber}>03</span>
              <span className={styles.metricLabel}>Start building</span>
            </div>
          </div>
        </div>

        <div className={styles.stage} aria-label="POT Starter Hub product preview">
          <div className={styles.stageTopline}>
            <span>THE PORTALDOT ECOSYSTEM</span>
            <span><i /> TESTNET ACTIVE</span>
          </div>

          <div className={styles.energyField} aria-hidden="true">
            <div className={`${styles.ring} ${styles.ringOne}`} />
            <div className={`${styles.ring} ${styles.ringTwo}`} />
            <div className={`${styles.ring} ${styles.ringThree}`} />
            <div className={styles.energyCore}>
              <div className={styles.coreLight} />
              <PotMark className={styles.coreMark} />
              <span>POT</span>
            </div>
            <div className={styles.energyLabel}>A NEW WORLD TO BUILD</div>
            {particles.map((particle) => (
              <span
                key={particle}
                className={styles.particle}
                style={{
                  "--i": particle,
                  "--x": `${(particle * 43 + 7) % 100}%`,
                  "--y": `${(particle * 61 + 13) % 100}%`,
                } as React.CSSProperties}
              />
            ))}
          </div>

          <div
            className={styles.phoneWrap}
            style={{
              "--tilt-x": `${pointer.y * -5}deg`,
              "--tilt-y": `${pointer.x * 7}deg`,
            } as React.CSSProperties}
          >
            <div className={styles.phone}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneHeader}>
                <div className={styles.miniBrand}>
                  <span><PotMark /></span>
                  <strong>POT<span>.</span></strong>
                </div>
                <span className={styles.networkPill}><i /> TESTNET</span>
              </div>

              <div className={styles.phoneGreeting}>
                <span>YOUR BUILDER SPACE</span>
                <h2>Ready to<br />make a move?</h2>
              </div>

              <div className={styles.balanceCard}>
                <div className={styles.balanceTop}>
                  <span>TESTNET ASSETS</span>
                  <span className={styles.balanceIcon}>↗</span>
                </div>
                <div className={styles.balanceValue}>POT <span>TEST TOKENS</span></div>
                <div className={styles.balanceBottom}>
                  <span className={styles.balanceIndicator} />
                  Tokens for testing, not trading
                </div>
              </div>

              <div className={styles.phoneSectionTitle}>
                <span>YOUR NEXT STEPS</span>
                <span>01 — 03</span>
              </div>

              <div className={styles.phoneStep}>
                <span className={styles.phoneStepIcon}>◈</span>
                <span><strong>Prepare wallet</strong><small>Get your address ready</small></span>
                <span className={styles.stepDone}>↗</span>
              </div>
              <div className={styles.phoneStep}>
                <span className={styles.phoneStepIcon}>⌁</span>
                <span><strong>Request tokens</strong><small>Use the testnet faucet</small></span>
                <span className={styles.stepDone}>↗</span>
              </div>
              <div className={styles.phoneStep}>
                <span className={styles.phoneStepIcon}>⌘</span>
                <span><strong>Start exploring</strong><small>Experiment on-chain</small></span>
                <span className={styles.stepDone}>↗</span>
              </div>

              <Link href="/hub" className={styles.phoneButton}>
                Open your dashboard <Arrow />
              </Link>
              <div className={styles.phoneFooter}>EXPLORE · EXPERIMENT · BUILD</div>
            </div>
          </div>

          <div className={`${styles.floatCard} ${styles.floatCardLeft}`}>
            <span className={styles.floatIcon}>✳</span>
            <span><strong>Testnet ready</strong><small>Made for builders</small></span>
          </div>
          <div className={`${styles.floatCard} ${styles.floatCardRight}`}>
            <span className={styles.floatPulse} />
            <span><strong>Start here</strong><small>Your first on-chain move</small></span>
          </div>
        </div>

        <div className={styles.scrollCue}>
          <span className={styles.scrollLine} />
          SCROLL TO EXPLORE
        </div>
      </section>

      <section className={styles.manifesto} id="how-it-works">
        <div className={styles.sectionEyebrow}>
          <span /> THE STARTING POINT
        </div>
        <div className={styles.manifestoHeading}>
          <h2>
            Less setup.
            <br />
            <span>More building.</span>
          </h2>
          <p>
            Everything you need to take your first steps on the
            Portaldot V3 testnet, brought together in one focused experience.
          </p>
        </div>

        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <div className={styles.featureTop}>
              <span className={styles.featureIndex}>01 / WALLET</span>
              <span className={styles.featureGlyph}>◈</span>
            </div>
            <div className={styles.featureArtwork}>
              <div className={styles.walletVisual}>
                <div className={styles.walletStripe} />
                <div className={styles.walletChip} />
                <span>POT / CONNECT</span>
              </div>
            </div>
            <h3>Get connected.</h3>
            <p>Start with your compatible wallet address and get ready to explore.</p>
            <Link href="/hub" className={styles.featureLink}>Prepare your wallet <Arrow /></Link>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureTop}>
              <span className={styles.featureIndex}>02 / FAUCET</span>
              <span className={styles.featureGlyph}>⌁</span>
            </div>
            <div className={`${styles.featureArtwork} ${styles.faucetArtwork}`}>
              <div className={styles.tokenVisual}>
                <PotMark />
                <span>TEST TOKENS</span>
              </div>
              <div className={styles.tokenOrbit} />
            </div>
            <h3>Fuel your testing.</h3>
            <p>Use the faucet to request test tokens for eligible testnet activity.</p>
            <Link href="/hub" className={styles.featureLink}>Open the faucet <Arrow /></Link>
          </article>

          <article className={styles.featureCard}>
            <div className={styles.featureTop}>
              <span className={styles.featureIndex}>03 / EXPLORE</span>
              <span className={styles.featureGlyph}>⌘</span>
            </div>
            <div className={`${styles.featureArtwork} ${styles.buildArtwork}`}>
              <div className={styles.buildGrid}>
                {Array.from({ length: 16 }, (_, i) => <span key={i} />)}
              </div>
              <div className={styles.buildCenter}><PotMark /></div>
            </div>
            <h3>Make something real.</h3>
            <p>Explore the network, experiment with transactions, and keep building.</p>
            <a
              href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide"
              target="_blank"
              rel="noreferrer"
              className={styles.featureLink}
            >
              Read the guide <Arrow />
            </a>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalGlow} />
        <div className={styles.finalMark}><PotMark /></div>
        <span className={styles.sectionEyebrow}><span /> YOUR NEXT MOVE STARTS NOW</span>
        <h2>Enough watching.<br /><span>Start building.</span></h2>
        <p>Step into the Portaldot V3 testnet and begin experimenting.</p>
        <Link href="/hub" className={styles.primaryCta}>
          <span>Launch Starter Hub</span>
          <span className={styles.ctaArrow}><Arrow /></span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.footerBrand}>
          <span className={styles.brandSymbol}><PotMark /></span>
          <span className={styles.brandWords}><strong>POT<span>.</span></strong><small>STARTER HUB</small></span>
        </Link>
        <span className={styles.footerNote}>An entry point for the Portaldot V3 testnet.</span>
        <div className={styles.footerLinks}>
          <a href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide" target="_blank" rel="noreferrer">Guide <Arrow /></a>
          <Link href="/hub">Dashboard <Arrow /></Link>
        </div>
      </footer>
    </main>
  );
}





