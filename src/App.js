import { useState } from 'react';
import './App.scss';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function parseTimeRange(range) {
    const [start, end] = (range.match(/(\d+:\d\d)-(\d+:\d\d)/) || ['', '', '']).slice(1);
    return {
        start: start,
        end: end,
    }
}

function splitLine(line) {
    return line.split(',').map(range => parseTimeRange(range.trim()));
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function parseTime(time) {
    // Takes 'HH:MM', returns [HH, MM]
    return (time.match(/(\d+):(\d\d)/) || ['', '', '']).slice(1).map(n => parseInt(n));
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function timeToPercents(time) {
    const [a,b] = parseTime(time);
    return (a * 60 + b) / (24 * 60) * 100;
}

function timeRangesToGradient(timeRanges) {
    const bg = 'rgba(255, 255, 255, 0)';
    const fg = 'var(--sleep-color)';

    const ret = [
        '180deg', 
        `${bg} 0%`,
        timeRanges.map(range => [
            `${bg} ${timeToPercents(range.start)}%`,
            `${fg} ${timeToPercents(range.start)}%`,
            `${fg} ${timeToPercents(range.end)}%`,
            `${bg} ${timeToPercents(range.end)}%`,
        ]),
    ].flat();

    return ret.join(', ');
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function timeToSegmentNumber(time) {
    // '00:00' returns 0, '00:15' returns 1, and so on 
    const [a,b] = parseTime(time);
    return Math.floor((a * 60 + b) / 15);
}

function createHeatMap(timeRanges) {
    const heatMap = {};
    timeRanges.forEach(timeRange => {
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

    const ret = [
        '180deg',
        `${getColor(0)} 0%`,
    ];

    let lastVal = 0;
    for (let i = 0 ; i < segmentCount ; i++) {
        const curVal = heatMap[i] || 0;
        if (curVal !== lastVal) {
            const percent = Number(i / segmentCount * 100).toPrecision(3);
            ret.push(`${getColor(lastVal / maxVal)} ${percent}%`);
            ret.push(`${getColor(curVal / maxVal)} ${percent}%`);
            lastVal = curVal;
        }
    }
    ret.push(`${getColor(0)} 100%`);

    return ret.join(', ');
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function App() {
    const [src, setSrc] = useState('');

    const labels = [...Array(8).keys()].map(n => String(n * 3).padStart(2, '0') + ':00');
    
    const dataLines = src.split('\n').filter(line => line.trim().length > 0).map(splitLine);
    const columns = dataLines.map(timeRangesToGradient);

    const heatMapGradient = heatMapToGradient(createHeatMap(dataLines.flat()), dataLines.length)
    // console.log(heatMap)
    return (
        <main id='main'>
            <textarea 
                autoFocus
                value={src} 
                onChange={e => setSrc(e.target.value)}
                rows={10}
                placeholder='08:00-13:00, 14:00-15:00...'
            />

            <section id='result' style={{ '--cols': columns.length, '--col-width': '15px', '--sleep-color': '#89e' }}>
                <ul className='labels'>
                    {labels.map(label => <li key={label}>{label}</li>)}
                </ul>

                <div className='heat-map' style={{ background: `linear-gradient(${heatMapGradient})` }}>
                </div>

                <ul className='data'>
                    {columns.map((col, idx) => (
                        <li key={idx} className='column' style={{ background: `linear-gradient(${col})` }}></li>
                    ))}
                </ul>
            </section>
        </main>
    );
}

export default App;