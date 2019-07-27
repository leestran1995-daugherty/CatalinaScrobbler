var osascript = require('node-osascript');
var keychain = require('keychain');
const { app } = require('electron')
const dJSON = require('dirty-json');
var AutoLaunch = require('auto-launch');
var path = require('path');
const lastfm = require('./lastfm-controller');
var fs = require('fs');

/*
Detects what player is installed on user's computer (iTunes or Apple Music).
*/
function detectPlayer() {
    return new Promise(function(resolve, reject) {
        osascript.executeFile(__dirname+'/applescript/detect.scpt', function(err, result, raw){
            if (err) reject(Error(err));
            if (result == false) {
                resolve("iTunes")
            }
            else if (result == true) {
                resolve("Music")
            } 
            else {
                resolve("Music")
            }
        });
    });
}

/*
Replaces string x with a name of the player in the file applescript/nowplaying.scpt
*/
async function replacePlayer(player) {   
    fs.readFile(__dirname+'/applescript/nowplaying.scpt', 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/0x/g, player);
        result = data.replace(/iTunes/g, player);
        result = data.replace(/Music/g, player);
        fs.writeFile(__dirname+'/applescript/nowplaying.scpt', result, 'utf8', function (err) {
            if (err) return console.log(err);
        });
    });
}

/*
Handles saving preferences after pressing "Save" button in preferences.
*/
function savePreferences(arg) {
    if (arg.first === true) {
        /*
        let json = "{login: \""+Buffer.from(lastfm.keyStorage.username).toString('base64')+"\", password: \""+Buffer.from(lastfm.keyStorage.password).toString('base64')+"\"}"
        console.log(json);
        fs.writeFile(path.join(__dirname, '/../pass.txt'), json, 'utf8', function (err) {
            if (err) return console.log(err);
        });
        */
        keychain.setPassword({ account: lastfm.keyStorage.username, service: 'CatalinaScrobbler', password: lastfm.keyStorage.password }, function(err) {
            if (err) console.log(err);
            fs.writeFile(process.env.HOME+"/.catalinascrobbler", lastfm.keyStorage.username, 'utf8', function (err) {
                if (err) console.log(err);
            });
        });
    }
    if (arg.first === false) {
        /*
        fs.access(path.join(__dirname, '/../pass.txt'), fs.F_OK, (err) => {
            if (err) return console.log(err);
            fs.unlink(path.join(__dirname, '/../pass.txt'), function(err){
                if (err) return console.log(err);
            });
          })
        */
        keychain.deletePassword({ account: lastfm.keyStorage.username, service: 'CatalinaScrobbler', password: lastfm.keyStorage.password }, function(err) {
            if (err) console.log(err);
            fs.access(process.env.HOME+"/.catalinascrobbler", fs.F_OK, (err) => {
                if (err) console.log(err);
                fs.unlink(process.env.HOME+"/.catalinascrobbler", function(err){
                    if (err) console.log(err);
                });
            })
        });
    }
    if (arg.second === true) {
        autoLaunchEnable();
    }
    if (arg.second === false) {
        autoLaunchDisable();
    }
}

/*
Checks if username and password is saved in keychain and home directory.
*/
function rememberUser() {
    if (fs.existsSync(process.env.HOME+"/.catalinascrobbler")) {
        keychain.getPassword({ account: fs.readFileSync(process.env.HOME+"/.catalinascrobbler"), service: 'CatalinaScrobbler' }, function(err, pass) {
            lastfm.login(fs.readFileSync(process.env.HOME+"/.catalinascrobbler"),pass).then(result => {
                app.dock.hide();
                console.log(result); 
                return true;
            }).catch(err => {
                console.log(err); 
                app.emit('loginOpen'); 
                return false;
            });
            return true;
        });
    }
    else {
        return false;
    }
    /*
    try {
        if (fs.existsSync(path.join(__dirname, '/../pass.txt'))) {
            let rawdata = fs.readFileSync(path.join(__dirname, '/../pass.txt'));
            console.log(Buffer.from(dJSON.parse(rawdata).login, 'base64').toString('utf8'));
            lastfm.login(Buffer.from(dJSON.parse(rawdata).login, 'base64').toString('utf8'), Buffer.from(dJSON.parse(rawdata).password, 'base64').toString('utf8')).catch(err => app.emit('loginOpen'))
            return true;
        }
        else {
            return false;
        }
    } catch(err) {
        console.log(err);
        return false;
    }
    console.log("123123");
    */
}

/*
Summarized version of the rememberUser() function for use within preferences.html
*/
function preferencesRememberUser() {
    if (fs.existsSync(process.env.HOME+"/.catalinascrobbler")) {
        return true;
    }
    else {
        return false;
    }
}

/*
As the name says, it enables auto launch of the application upon system's startup
*/
function autoLaunchEnable() {
    if (__dirname.includes(".app")){
        try {
            var appPath = app.getPath('exe').split('.app/Content')[0] + '.app';
            al = new AutoLaunch({
            name: app.getName(),
            path: appPath,
            });
            al.enable();
        } catch (err) {
            console.log(err);
        }
    }

}
/*
As the name says, it disables auto launch of the application upon system's startup
*/
function autoLaunchDisable() {
    if (__dirname.includes(".app")){
        try {
            var appPath = app.getPath('exe').split('.app/Content')[0] + '.app';
            al = new AutoLaunch({
            name: app.getName(),
            path: appPath,
            });
            al.disable();
        } catch (err) {
            console.log(err);
        }
    }
}
/*
Promise to check if autolaunch is enabled.
*/
function autoLaunchEnabled() {
    return new Promise(function(resolve, reject) {
        if (__dirname.includes(".app")){
            try {
                console.log("eloooo");
                var appPath = process.execPath.split('.app/Content')[0] + '.app';
                al = new AutoLaunch({
                name: "CatalinaScrobbler", //Hard coded, TODO: Find a way to access it from a browser.
                path: appPath,
                });
                al.isEnabled()
                .then(function(isEnabled){
                    if (isEnabled) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                })
                .catch(function(err){
                    console.log(err);
                    resolve(false);
                });
            } catch (err) {
                console.log(err);
                resolve(false);
            }
        }
        else {
            resolve(false);
        }
    });
}

module.exports = {
    detectPlayer,
    replacePlayer,
    savePreferences,
    rememberUser,
    autoLaunchEnable,
    autoLaunchEnabled,
    autoLaunchDisable,
    preferencesRememberUser
}