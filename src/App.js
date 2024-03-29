import { useState } from "react";
import "./App.scss";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function parseTimeRange(range) {
    const [start, end] = (range.match(/(\d+:\d\d)-(\d+:\d\d)/) || ["", "", ""]).slice(1);
    return {
        start: start,
        end: end
    };
}

function splitLine(line) {
    return line.split(",").map((range) => parseTimeRange(range.trim()));
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function parseTime(time) {
    // Takes 'HH:MM', returns [HH, MM]
    return (time.match(/(\d+):(\d\d)/) || ["", "", ""])
        .slice(1)
        .map((n) => parseInt(n));
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function timeToPercents(time) {
    const [a, b] = parseTime(time);
    return ((a * 60 + b) / (24 * 60)) * 100;
}

function timeRangesToGradient(timeRanges) {
    const bg = "rgba(255, 255, 255, 0)";
    const fg = "var(--sleep-color)";

    const ret = [
        "180deg",
        `${bg} 0%`,
        timeRanges.map((range) => [
            `${bg} ${timeToPercents(range.start)}%`,
            `${fg} ${timeToPercents(range.start)}%`,
            `${fg} ${timeToPercents(range.end)}%`,
            `${bg} ${timeToPercents(range.end)}%`
        ])
    ].flat();

    return ret.join(", ");
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function timeToSegmentNumber(time) {
    // '00:00' returns 0, '00:15' returns 1, and so on
    const [a, b] = parseTime(time);
    return Math.floor((a * 60 + b) / 15);
}

function createHeatMap(timeRanges) {
    const heatMap = {};
    timeRanges.forEach((timeRange) => {
        const { start, end } = timeRange;
        for (let i = timeToSegmentNumber(start) ; i <= timeToSegmentNumber(end) ; i++) {
            heatMap[i] = (heatMap[i] || 0) + 1;
        }
    });

    return heatMap;
}

function heatMapToGradient(heatMap, maxVal) {
    const segmentCount = 24 * (60 / 15);

    // There doesn't appear to be a way in CSS to add alpha to a given color, unfortunately
    const getColor = (alpha) => `rgba(136, 153, 238, ${Number(alpha).toPrecision(3)})`;

    const ret = ["180deg", `${getColor(0)} 0%`];

    let lastVal = 0;
    for (let i = 0; i < segmentCount; i++) {
        const curVal = heatMap[i] || 0;
        if (curVal !== lastVal) {
            const percent = Number((i / segmentCount) * 100).toPrecision(3);
            ret.push(`${getColor(lastVal / maxVal)} ${percent}%`);
            ret.push(`${getColor(curVal / maxVal)} ${percent}%`);
            lastVal = curVal;
        }
    }
    ret.push(`${getColor(0)} 100%`);

    return ret.join(", ");
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function timeRangesToTotalDuration(timeRanges) {
    let totalDuration = 0;

    timeRanges.forEach(({ start, end }) => {
        const [startHour, startMin] = [...parseTime(start)];
        const [endHour, endMin] = [...parseTime(end)];
        const duration = 60 * endHour + endMin - (60 * startHour + startMin);
        totalDuration += duration;
    });

    return totalDuration;
}

function durationToDurationString(duration) {
    const h = Math.floor(duration / 60);
    const m = duration % 60;

    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// I'm going to go by a reasonable assumption that there's no day with more than 18 hours of sleep, to make the graph prettier with minimum effort
const MAX_PER_DAY = 18;

function lineToTotalDurationGradient(line) {
    const totalDuration = timeRangesToTotalDuration(line);
    const bg = "rgba(255, 255, 255, 0)";
    const fg = "var(--sleep-color)";
    const heightPercent = 100 * (MAX_PER_DAY * 60 - totalDuration) / (MAX_PER_DAY * 60);

    const ret = [
        "180deg",
        `${bg} 0%`,
        `${bg} ${heightPercent}%`,
        `${fg} ${heightPercent}%`,
        `${fg} 100%`,
    ];

    return ret.join(", ");
}


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
    const [src, setSrc] = useState("");

    const timeTableLabels = [...Array(8).keys()].map((n) => String(n * 3).padStart(2, "0") + ":00");
    const totalsLabels = [...Array(MAX_PER_DAY / 3).keys()].map((n) => String((n + 1) * 3)).reverse();

    const dataLines = src.split("\n")
        .filter((line) => line.trim().length > 0)
        .map(splitLine);

    const columns = dataLines.map((line) => ({
        gradient: timeRangesToGradient(line),
        totalDuration: timeRangesToTotalDuration(line),
        totalDurationGradient: lineToTotalDurationGradient(line),
    }));

    const averageTotalDurationPerLine = Math.floor(columns.reduce((acc, elem) => acc + elem.totalDuration, 0) / columns.length);

    const heatMapGradient = heatMapToGradient(createHeatMap(dataLines.flat()), dataLines.length);

    return (
        <main id="main">
            <textarea
                autoFocus
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                rows={10}
                placeholder="08:00-13:00, 14:00-15:00..."
            />

            <div>
                <section id="timetable" style={{ "--cols": columns.length, "--col-width": "15px", "--sleep-color": "#89e" }}>
                    <ul className="labels">
                        {timeTableLabels.map((label) => (<li key={label}>{label}</li>))}
                    </ul>

                    <div
                        className="heat-map"
                        style={{ background: `linear-gradient(${heatMapGradient})` }}
                        title={`Average: ${durationToDurationString(averageTotalDurationPerLine)}`}
                    ></div>

                    <ul className="data">
                        {columns.map((col, idx) => (
                            <li
                                key={idx}
                                className="column"
                                style={{ background: `linear-gradient(${col.gradient})` }}
                                title={durationToDurationString(col.totalDuration)}
                            ></li>
                        ))}
                    </ul>
                </section>

                <section id="totals" style={{ "--cols": columns.length, "--col-width": "15px", "--sleep-color": "#89e" }}>
                    <ul className="labels">
                        {totalsLabels.map((label) => (<li key={label}>{label}</li>))}
                    </ul>

                    <ul className="data">
                        {columns.map((col, idx) => (
                            <li
                                key={idx}
                                className="column"
                                style={{ background: `linear-gradient(${col.totalDurationGradient})` }}
                                title={durationToDurationString(col.totalDuration)}
                            ></li>
                        ))}
                    </ul>
                </section>
            </div>
        </main>
    );
}

export default App;
