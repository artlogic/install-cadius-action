import * as os from 'os';
import * as util from 'util';
import * as fs from 'fs';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';

function getDownloadURL(version: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/digarok/cadius/releases/download/%s/cadius-ubuntu-latest-%s.zip', version, version);
        case 'Darwin':
            return util.format('https://github.com/digarok/cadius/releases/download/%s/cadius-macos-latest-%s.zip', version, version);
        case 'Windows_NT':
        default:
            return util.format('https://github.com/digarok/cadius/releases/download/%s/cadius-windows-latest-%s.zip', version, version);
    }
}

async function downloadCadius(version: string) {
    let cachedToolpath = toolCache.find('cadius', version);
    if (!cachedToolpath) {
        let downloadPath;
        try {
            downloadPath = await toolCache.downloadTool(getDownloadURL(version));
        } catch (exception) {
            console.log(exception)
            throw new Error(util.format("Failed to download Cadius from location ", getDownloadURL(version)));
        }
        const extractedPath = await toolCache.extractZip(downloadPath);
        cachedToolpath = await toolCache.cacheDir(extractedPath, 'cadius', version);
    }
    core.addPath(cachedToolpath)
    return cachedToolpath
}

async function downloadProdos(cadiusPath: string) {
    // get real exe location (is this needed?)
    let cadiusExe = util.format('%s/cadius', cadiusPath)
    if (os.type() == 'Windows_NT') {
        cadiusExe = util.format('%s/Cadius.exe', cadiusPath)
    }

    const downloadP8URL = 'https://github.com/ProDOS-8/ProDOS8-Releases/releases/download/2.4.3/ProDOS_2_4_3.po'
    
    let p8DownloadPath;

    try {
        p8DownloadPath = await toolCache.downloadTool(downloadP8URL);
    } catch (exception) {
        console.log(exception);
        throw new Error(util.format("Failed to download ProDOS from location ", downloadP8URL));
    }
    console.log(util.format("Downloaded file: ", p8DownloadPath));
    // move it so it's in the user workspace in any future steps
    fs.renameSync(p8DownloadPath, './ProDOS_2_4_3.po');

    // Now we need to a) convert the image and b) extract the volume file locally
    try {
        const spawnSync = require("child_process").spawnSync;

        const cadiusProcess = spawnSync(cadiusExe, ['extractvolume', 'ProDOS_2_4_3.po', '.'],{ encoding : 'utf8' })
        console.log(cadiusProcess.stdout);
    } catch (exception) {
        console.log(exception);
        console.log("Unable to complete ProDOS download and extraction.");
    }
}

async function run() {
    let version = core.getInput('version');
    if (!version) {
        version = '0.0.0';  // default
    }
    let includeProdos = false;
    let inputIncludeProdos = core.getInput('include_prodos');
    if (inputIncludeProdos.toLowerCase() == "true" || inputIncludeProdos == "") {
        includeProdos = true;  // default
    }
    console.log(`INPUTS - version '${version}'`);
    console.log(`INPUTS - includeProdos '${includeProdos}'`);

    let cadiusPath = await downloadCadius(version);

    console.log(`Cadius version: '${version}' has been downloaded and added to path`);
    if (includeProdos) {
        await downloadProdos(cadiusPath);
        console.log(`ProDOS download and extraction completed`);
    }
}

run().catch(core.setFailed);
