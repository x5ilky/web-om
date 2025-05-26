import * as zip from "@zip.js/zip.js";

export type OsuFile = {
    General: Map<string, string>,
    Metadata: Map<string, string>,
    Difficulty: Map<string, string>,
    Events: {
        eventType: string,
        startTime: number,
        eventParams: string
    }[],
    Backgrounds: {
        filename: string,
        xOffset: number,
        yOffset: number,
    }[],
    Breaks: {
        startTime: number,
        endTime: number,
    }[],
    TimingPoints: {
        time: number,
        beatLength: number,
        meter: number,
        sampleSet: number,
        sampleIndex: number,
        volume: number,
        uninherited: boolean,
        effects: number
    }[],
    HitObjects: {
        x: number,
        time: number,
        type: number,
        objectParams: number[],
        hitSample: number[]
    }[],
}
export type Beatmaps = {
    files: {
        file: OsuFile,
        audioReference: Uint8Array
    }[]
};

export class OsuParser {
    blob: Blob;
    constructor(blob: Blob) {
        this.blob = blob;    
    }
    
    async parse() {
        const objs: Beatmaps = {
            files: []
        };
        const zipFileReader = new zip.BlobReader(this.blob);
        // Creates a TextWriter object where the content of the first entry in the zip
        // will be written.

        // Creates a ZipReader object reading the zip content via `zipFileReader`,
        // retrieves metadata (name, dates, etc.) of the first entry, retrieves its
        // content via `helloWorldWriter`, and closes the reader.
        const zipReader = new zip.ZipReader(zipFileReader);
        const entries = new Map((await zipReader.getEntries()).map(a => [a.filename, a]));

        await zipReader.close();

        // Displays "Hello world!".
        for (const [name, entry] of entries) {
            if (!name.endsWith(".osu")) continue;
            const textWriter = new zip.TextWriter();
            const uint8arrayWriter = new zip.Uint8ArrayWriter();
            console.log(`Processing ${name}`)
            const contents = await entry.getData!(textWriter);
            const file = this.parseOsuFile(contents);
            const audioReferenceEntry = entries.get(file.General.get("AudioFilename")!);
            const audioReference = await audioReferenceEntry?.getData!(uint8arrayWriter);
            if (audioReference === undefined) throw new Error("Could not find audio for beatmap")
            objs.files.push({
                file,
                audioReference
            });
        }
        return objs;
    }

    parseOsuFile(text: string) {
        const obj: OsuFile = {
            Backgrounds: [],
            Breaks: [],
            Difficulty: new Map(),
            Events: [],
            General: new Map(),
            HitObjects: [],
            Metadata: new Map(),
            TimingPoints: []
        };
        const lines = text.split(/\r?\n/g).filter(a => a);
        if (lines.shift() !== "osu file format v14") throw new Error(`Invalid osu file format version`);
        for (let i = 0; i < lines.length; ) {
            const header = lines[i];
            if (!(header.startsWith("[") && header.endsWith("]"))) throw new Error(`Expected section header`);
            const name = (header.slice(1, -1));
            
            while (!(lines?.[++i]?.startsWith("[") ?? true)) {
                const ln = lines[i];
                if ([
                    "General",
                    "Metadata",
                    "Difficulty",
                ].includes(name)) {
                    const [k, v] = ln.split(/:\s*/, 2);
                    (obj as any)[name].set(k, v);
                }
                if (name === "HitObjects") {
                    const parts = ln.split(/,/g);
                    obj.HitObjects.push({
                        x: parseInt(parts[0]),
                        time: parseInt(parts[2]),
                        type: parseInt(parts[3]),
                        objectParams: parts.slice(4, -1).map(parseInt),
                        hitSample: parts.slice(-1)[0].split(":").filter(a => a).map(a => parseInt(a)),
                    })
                }
            }
        }
        return obj;
    }
}