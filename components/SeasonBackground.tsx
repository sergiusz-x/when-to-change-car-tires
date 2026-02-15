import styles from "./SeasonBackground.module.css"

export default function SeasonBackground() {
    return (
        <div className={styles.scene} aria-hidden="true">
            {/* ── Winter half ── */}
            <div className={styles.winter}>
                <div className={styles.winterSky} />
                <div className={styles.moon} />
                <div className={styles.stars} />

                <div className={`${styles.snowLayer} ${styles.snowA}`} />
                <div className={`${styles.snowLayer} ${styles.snowB}`} />
                <div className={`${styles.snowLayer} ${styles.snowC}`} />
                <div className={`${styles.snowLayer} ${styles.snowD}`} />

                <div className={styles.winterGround} />

                {/* pixel snowmen by the road */}
                <span className={`${styles.prop} ${styles.snowman1}`} />
                <span className={`${styles.prop} ${styles.snowman2}`} />
                <span className={`${styles.prop} ${styles.snowman3}`} />
                <span className={`${styles.prop} ${styles.snowman4}`} />
                <span className={`${styles.prop} ${styles.snowmanLow1}`} />
                <span className={`${styles.prop} ${styles.snowmanLow2}`} />
            </div>

            {/* ── Summer half ── */}
            <div className={styles.summer}>
                <div className={styles.summerSky} />
                <div className={styles.sun} />
                <div className={styles.sunGlow} />

                <div className={`${styles.pixelCloud} ${styles.pc1}`} />
                <div className={`${styles.pixelCloud} ${styles.pc2}`} />
                <div className={`${styles.pixelCloud} ${styles.pc3}`} />
                <div className={`${styles.pixelCloud} ${styles.pc4}`} />
                <div className={`${styles.pixelCloud} ${styles.pc5}`} />
                <div className={`${styles.pixelCloud} ${styles.pc6}`} />

                <div className={styles.summerGround} />

                {/* pixel flowers by the road */}
                <span className={`${styles.prop} ${styles.flower1}`} />
                <span className={`${styles.prop} ${styles.flower2}`} />
                <span className={`${styles.prop} ${styles.flower3}`} />
                <span className={`${styles.prop} ${styles.flower4}`} />
                <span className={`${styles.prop} ${styles.flower5}`} />
                <span className={`${styles.prop} ${styles.flowerLow1}`} />
                <span className={`${styles.prop} ${styles.flowerLow2}`} />
            </div>

            {/* ── Road & divider ── */}
            <div className={styles.divider} />
            <div className={styles.road}>
                <div className={styles.lane} />
            </div>

            {/* ── Car ── */}
            <div className={styles.carTrack}>
                <div className={styles.carDirection}>
                    <div className={styles.car}>
                        <span className={styles.carBody} />
                        <span className={styles.carCabin} />
                        <span className={styles.carWindow} />
                        <span className={styles.headlight} />
                        <span className={styles.tailLight} />

                        <span className={`${styles.wheel} ${styles.wheelFront}`}>
                            <span className={`${styles.tireFill} ${styles.summerTire}`} />
                            <span className={`${styles.tireFill} ${styles.winterTire}`} />
                            <span className={styles.hubcap} />
                        </span>
                        <span className={`${styles.wheel} ${styles.wheelRear}`}>
                            <span className={`${styles.tireFill} ${styles.summerTire}`} />
                            <span className={`${styles.tireFill} ${styles.winterTire}`} />
                            <span className={styles.hubcap} />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
