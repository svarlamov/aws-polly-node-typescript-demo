require('dotenv').config();
import { Request, Response } from 'express';
import express from 'express';
import * as AWS from 'aws-sdk';
import * as http from 'http';
import * as fs from 'fs';

const AUDIO_FORMATS = {
    "ogg_vorbis": "audio/ogg",
    "mp3": "audio/mpeg",
    "pcm": "audio/wave; codecs=1"
} as any;

const polly = new AWS.Polly({ apiVersion: '2016-06-10' });

const app = express();

app.get('/', (req: Request, res: Response) => {
    fs.readFile('index.html', (err, data) => {
        if (err) {
            res.sendStatus(500);
            return console.error(err);
        }
        res.setHeader('Content-Type', 'text/html');
        res.send(data);
    });
});

app.get('/voices', async (_: Request, res: Response) => {
    try {
        const voices = await polly.describeVoices().promise();
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(voices.Voices));
    } catch (err) {
        res.sendStatus(500);
        console.error(err);
    }
});

app.get('/read', async (req: Request, res: Response) => {
    const params = req.query;

    if (!params.text || !params.voiceId || !AUDIO_FORMATS[params.outputFormat as string]) {
        res.sendStatus(400);
        return console.error('Wrong parameters');
    }

    try {
        const data = await polly.synthesizeSpeech({
            Text: params.text as string,
            VoiceId: params.voiceId as string,
            OutputFormat: params.outputFormat as string,
            Engine: 'neural'
        }).promise();

        res.setHeader('Content-Type', AUDIO_FORMATS[params.outputFormat as string]);
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Connection', 'close');
        
        // stream.pipeline(data.AudioStream as stream.Readable, res, (err) => {
        //     if (err) console.error('Error streaming audio:', err);
        // });
        res.write(data.AudioStream);
        res.end();

    } catch (err) {
        res.sendStatus(500);
        console.error(err);
    }
});

const server = http.createServer(app);
const PORT = 8000;
const HOST = 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`Starting server, use <Ctrl-C> to stop...`);
    console.log(`Open http://${HOST}:${PORT} in a web browser.`);
});

