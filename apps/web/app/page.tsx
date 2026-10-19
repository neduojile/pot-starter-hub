"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import LiveFaucetData from "./live-faucet-data";
import WalletAddressChecker from "./wallet-address-checker";

type Section = "home" | "faucet" | "guide" | "activity";

const navigation: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "Overview", icon: "home" },
  { id: "faucet", label: "Faucet", icon: "droplet" },
  { id: "guide", label: "Getting started", icon: "book" },
  { id: "activity", label: "Claim history", icon: "history" },
];

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></svg>;
    case "droplet":
      return <svg {...common}><path d="M12 22a8 8 0 0 0 8-8c0-4-8-12-8-12S4 10 4 14a8 8 0 0 0 8 8Z" /><path d="M8 15a4 4 0 0 0 4 4" /></svg>;
    case "book":
      return <svg {...common}><path d="M12 7v14" /><path d="M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a3 3 0 0 0-3 2 3 3 0 0 0-3-2H5a2 2 0 0 1-2-2Z" /></svg>;
    case "history":
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M7 17 17 7M7 7h10v10" /></svg>;
    case "wallet":
      return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 9h18M16 14h.01" /><path d="M6 5V4a2 2 0 0 1 2-2h10" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "external":
      return <svg {...common}><path d="M14 3h7v7M10 14 21 3" /><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "spark":
      return <svg {...common}><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function Brand() {
  return (
    <div className={styles.brand}>
      <div className={styles.brandMark}><Icon name="droplet" size={22} /></div>
      <div className={styles.brandWords}>
        <span>POT<span className={styles.brandAccent}>.</span></span>
        <small>STARTER HUB</small>
      </div>
    </div>
  );
}


function TypingEyebrow({
  text,
  styles,
}: {
  text: string;
  styles: Record<string, string>;
}) {
  const [visibleText, setVisibleText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const fullText = text;

    if (!deleting && visibleText === fullText) {
      timeout = setTimeout(() => setDeleting(true), 1100);
    } else if (deleting && visibleText.length === 0) {
      timeout = setTimeout(() => setDeleting(false), 350);
    } else {
      timeout = setTimeout(() => {
        setVisibleText((current) =>
          deleting
            ? current.slice(0, -1)
            : fullText.slice(0, current.length + 1)
        );
      }, deleting ? 32 : 68);
    }

    return () => clearTimeout(timeout);
  }, [text, visibleText, deleting]);

  return (
    <span className={styles.typedEyebrowText}>
      {visibleText}
      <span className={styles.typedEyebrowCursor} aria-hidden="true" />
    </span>
  );
}

export default function Home() {
  const [active, setActive] = useState<Section>("home");
  const [networkOnline, setNetworkOnline] = useState<boolean | null>(null);
  const [navVisible, setNavVisible] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reveal = () => {
      setNavVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setNavVisible(false), 1800);
    };
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("touchstart", reveal, { passive: true });
    window.addEventListener("pointerdown", reveal, { passive: true });
    window.addEventListener("keydown", reveal);
    reveal();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("touchstart", reveal);
      window.removeEventListener("pointerdown", reveal);
      window.removeEventListener("keydown", reveal);
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/chain/status", { cache: "no-store" });
        const data: { online?: boolean } = await response.json();
        if (mounted) setNetworkOnline(response.ok && data.online === true);
      } catch {
        if (mounted) setNetworkOnline(false);
      }
    };
    void checkStatus();
    const timer = setInterval(() => void checkStatus(), 30000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const heading: Record<Section, { eyebrow: string; title: string; subtitle: string }> = {
    home: {
      eyebrow: "YOUR DEVELOPER STARTING POINT",
      title: "Everything starts here.",
      subtitle: "Get ready to explore Portaldot V3, one step at a time.",
    },
    faucet: {
      eyebrow: "TESTNET FAUCET",
      title: "Get your test tokens.",
      subtitle: "Prepare your wallet and check the faucet status before claiming.",
    },
    guide: {
      eyebrow: "QUICK START",
      title: "Your first steps.",
      subtitle: "A simple path from wallet setup to your first testnet transaction.",
    },
    activity: {
      eyebrow: "YOUR CLAIMS",
      title: "Your activity.",
      subtitle: "Keep track of your faucet claims and transaction history.",
    },
  };

  const current = heading[active];

  return (
    <main className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Brand />
        <div className={styles.sideLabel}>WORKSPACE</div>
        <nav className={styles.sideNav} aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${active === item.id ? styles.navActive : ""}`}
              onClick={() => setActive(item.id)}
              aria-current={active === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {active === item.id && <span className={styles.activeDot} />}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarSpacer} />
        <div className={styles.sideNetworkCard}>
          <span className={styles.networkIcon}><Icon name="shield" size={18} /></span>
          <div>
            <strong>Portaldot V3</strong>
            <span className={styles.networkUnavailable}><i /> {networkOnline === null ? "Checking network..." : networkOnline ? "Network online" : "Network unavailable"}</span>
          </div>
        </div>
        <div className={styles.sidebarFooter}>BUILT FOR BUILDERS <span>?</span></div>
      </aside>

      <section className={styles.mainArea}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span>Workspace</span><span className={styles.breadcrumbSlash}>/</span><strong>{navigation.find((n) => n.id === active)?.label}</strong>
          </div>
          <div className={styles.topbarRight}>
            <section className={styles.outageBanner} aria-live="polite">
              <span className={styles.outageIcon}><Icon name="shield" size={19} /></span>
              <div className={styles.outageText}>
                <strong>{networkOnline === null ? "Checking Portaldot V3 status" : networkOnline ? "Portaldot V3 is reachable" : "Portaldot V3 is temporarily unavailable"}</strong>
                <p>{networkOnline === null ? "Checking the live network endpoint." : networkOnline ? "The network endpoint is responding. Check faucet eligibility before claiming." : "The network endpoint is not responding. Faucet claims remain paused. Your wallet and funds are not affected."}</p>
              </div>
              <span className={styles.outageStatus}>{networkOnline === null ? "Checking" : networkOnline ? "Online" : "Unavailable"}</span>
            </section>

          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.pageIntro}>
            <div>
              <div className={styles.eyebrow}><span className={styles.eyebrowDot} /><TypingEyebrow text={current.eyebrow} styles={styles} /></div>
              <h1>{current.title}</h1>
              <p>{current.subtitle}</p>
            </div>
            <div className={styles.introBadge}><Icon name="spark" size={16} /> Made for builders</div>
          </div>



          {(active === "home" || active === "faucet") && (
            <section className={styles.dashboardGrid}>
              <div className={styles.faucetCard}>
                <div className={styles.faucetCardTop}>
                  <span className={styles.cardKicker}><span className={styles.liveDot} /> TESTNET FAUCET</span>
                  <span className={styles.cardSymbol}>tPOTv3</span>
                </div>
                <div className={styles.faucetHeading}>
                  <div>
                    <span className={styles.mutedLabel}>YOUR TEST TOKEN ALLOCATION</span>
                    <div className={styles.amount}>10 <span>tPOTv3</span></div>
                  </div>
                  <div className={styles.tokenOrb}><Icon name="droplet" size={34} /></div>
                </div>
                <p className={styles.faucetDescription}>Free test tokens for experimenting, deploying and learning on the Portaldot V3 testnet.</p>
                <div className={styles.faucetDivider} />
                <div className={styles.faucetMeta}>
                  <div><Icon name="clock" size={17} /><span>Cooldown</span><strong>24 hours</strong></div>
                  <div><Icon name="shield" size={17} /><span>Per wallet</span><strong>1 claim / day</strong></div>
                </div>
                <button
                  className={styles.claimButton}
                  type="button"
                  onClick={() => {
                    document.getElementById("native-wallet-address")?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    window.setTimeout(() => {
                      document.getElementById("native-wallet-address")?.focus({ preventScroll: true });
                    }, 450);
                  }}
                >
                  <Icon name="droplet" size={18} /> Claim 10 tPOTv3
                </button>
                <div className={styles.claimFootnote}><Icon name="shield" size={14} /> Verify your wallet eligibility and cooldown before requesting tokens.</div>
              </div>

              <div className={styles.rightColumn}>
                <div className={styles.integratedWallet}>
                  <div className={styles.integratedWalletHeader}>
                    <span className={styles.walletIcon}><Icon name="wallet" size={19} /></span>
                    <div>
                      <span className={styles.mutedLabel}>YOUR WALLET</span>
                      <strong>Ready when you are.</strong>
                    </div>
                  </div>
                  <WalletAddressChecker />
                  <div className={styles.walletFoot}>
                    <span><Icon name="shield" size={14} /> Non-custodial</span>
                    <span>Never share your seed phrase</span>
                  </div>
                </div>


                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}><Icon name="spark" size={19} /></div>
                  <div className={styles.infoCopy}><strong>New to Portaldot?</strong><p>Follow the quick-start guide to connect your wallet and explore the testnet.</p><button onClick={() => setActive("guide")}>Explore the guide <Icon name="arrow" size={15} /></button></div>
                </div>
              </div>
            </section>
          )}
          {(active === "home" || active === "activity") && (
            <section className={styles.activitySection}>
              <LiveFaucetData onViewAll={() => setActive("activity")} />
            </section>
          )}

          {active === "guide" && (
            <section className={styles.guideSection}>
              <div className={styles.guideIntro}><span className={styles.mutedLabel}>YOUR QUICK-START CHECKLIST</span><h2>From setup to your first transaction.</h2><p>Follow these steps in order. Network access and faucet availability are separate, so check both before claiming.</p></div>
              <div className={styles.guideGrid}>
                <article className={styles.guideCard}><span className={styles.stepNumber}>01</span><div className={styles.guideIcon}><Icon name="wallet" size={23} /></div><h3>Prepare your wallet</h3><p>Use a wallet that supports Portaldot V3. Copy your native address beginning with 5. Never share your recovery phrase or enter it on this site.</p><span className={styles.stepStatus}>Start here</span></article>
                <article className={styles.guideCard}><span className={styles.stepNumber}>02</span><div className={styles.guideIcon}><Icon name="droplet" size={23} /></div><h3>Check eligibility and claim</h3><p>Enter your native Portaldot V3 address and verify eligibility. When claims are enabled and you qualify, request 10 tPOTv3. The cooldown is 24 hours.</p><span className={styles.stepStatus}><i /> Check faucet status</span></article>
                <article className={styles.guideCard}><span className={styles.stepNumber}>03</span><div className={styles.guideIcon}><Icon name="arrow" size={23} /></div><h3>Make a transaction</h3><p>After receiving your tokens, check your balance and use a compatible wallet or developer tool to explore testnet transactions. Test tokens have no mainnet value.</p><span className={styles.stepStatus}>After claiming</span></article>
              </div>
              <div className={styles.guideCallout}><Icon name="book" size={20} /><div><strong>Learn from the official guide</strong><p>Use Portaldot's official testnet documentation for the latest network setup instructions.</p><a href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide" target="_blank" rel="noreferrer">Open documentation <Icon name="external" size={14} /></a></div></div>
            </section>
          )}

          <footer className={styles.pageFooter}><span><span className={styles.footerMark}>?</span> POT Starter Hub</span><span>Made for the next wave of builders.</span><a href="https://github.com/ItsCogumellum/portaldot-v3-testnet-guide" target="_blank" rel="noreferrer">Documentation <Icon name="external" size={13} /></a></footer>
        </div>
      </section>

      <nav className={`${styles.mobileNav} ${navVisible ? styles.mobileNavVisible : styles.mobileNavHidden}`} aria-label="Mobile navigation">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={`${styles.mobileNavItem} ${active === item.id ? styles.mobileNavActive : ""}`}
            onClick={() => setActive(item.id)}
            aria-current={active === item.id ? "page" : undefined}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.id === "home" ? "Home" : item.id === "activity" ? "Activity" : item.label === "Getting started" ? "Guide" : item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
















