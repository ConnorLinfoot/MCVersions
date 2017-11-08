const version = '1.0.0', request = require('request'), fs = require('fs'), Twitter = require('twitter');
let known_versions = [], latest_snapshot = '', latest_release = '';
console.log('MC Versions v' + version);

if( !fs.existsSync('./config') ) {
    console.log('No config found');
    process.exit(0);
}
const config = fs.readFileSync('./config').toString().split('\n');
const check_interval = 30; // Time between checks in seconds
const bio = 'I\'m just a bot that will tweet when new Minecraft versions are detected! | My Creator @ConnorLinfoot';

const client = new Twitter({
    consumer_key: config[0],
    consumer_secret: config[1],
    access_token_key: config[2],
    access_token_secret: config[3]
});

const get_date = function() {
    const d = new Date();
    return d.getUTCDate() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCFullYear() + " " + d.getUTCHours() + ":" + d.getUTCMinutes() + ":"+ d.getUTCSeconds();
};

const check_versions = function(callback) {
    console.log('');
    console.log('Checking versions...');
    request('https://launchermeta.mojang.com/mc/game/version_manifest.json', function(err, res, data) {
        if( err ) {
            return;
        }
        try {
            data = JSON.parse(data);
            if( callback === undefined || callback === null ) {
                console.log('Received data...');
                console.log('Latest Snapshot: ' + data.latest.snapshot);
                console.log('Latest Release: ' + data.latest.release);

                if( data.latest.snapshot !== latest_snapshot ) {
                    client.post('statuses/update', {status: 'Latest Snapshot Updated: ' + data.latest.snapshot}, function(error, tweet, response) {
                        if( error ) return;
                        fs.writeFileSync('./latest_snapshot', data.latest.snapshot);
                        latest_snapshot = data.latest.snapshot;
                    });
                }

                if( data.latest.release !== latest_release ) {
                    client.post('statuses/update', {status: 'Latest Release Updated: ' + data.latest.release}, function(error, tweet, response) {
                        if( error ) return;
                        fs.writeFileSync('./latest_release', data.latest.release);
                        latest_release = data.latest.release;
                    });
                }

                // known_versions.shift();
                for( let version of data.versions ) {
                    if( known_versions.indexOf(version.id) === -1 ) {
                        console.log('New version detected: ' + version.id);
                        console.log(version);
                        client.post('statuses/update', {status: 'Minecraft Version Registered: ' + version.id}, function(error, tweet, response) {
                            if( error ) return;
                            known_versions.push(version.id);
                            let known_versions_str = fs.readFileSync('./known_versions').toString();
                            known_versions_str += version.id + '\n';
                            fs.writeFileSync('./known_versions', known_versions_str);
                        });
                    }
                }

                // Update bio to state last check time

                client.post('account/update_profile', {description: bio + ' | Last Checked: ' + get_date() + ' (UTC)'});

            } else {
                callback(data);
            }
        } catch( e ) {

        }
    });
};

if( !fs.existsSync('./known_versions') || !fs.existsSync('./latest_snapshot') || !fs.existsSync('./latest_release') ) {
    // Init
    check_versions(function(data) {
        if( !fs.existsSync('./known_versions') ) {
            let file_content = '';
            for( let version of data.versions ) {
                known_versions.push(version.id);
                file_content += version.id + '\n';
            }
            fs.writeFileSync('./known_versions', file_content);
        }

        if( !fs.existsSync('./latest_snapshot') ) {
            fs.writeFileSync('./latest_snapshot', data.latest.snapshot);
            latest_release = data.latest.snapshot;
        }

        if( !fs.existsSync('./latest_release') ) {
            fs.writeFileSync('./latest_release', data.latest.release);
            latest_release = data.latest.release;
        }

        setInterval(check_versions, check_interval * 1000);
    });
} else {
    const known_versions_str = fs.readFileSync('./known_versions').toString().split('\n');
    for( let version of known_versions_str ) {
        if( version !== '' ) {
            known_versions.push(version);
        }
    }

    latest_snapshot = fs.readFileSync('./latest_snapshot').toString();
    latest_release = fs.readFileSync('./latest_release').toString();

    check_versions();
    setInterval(check_versions, check_interval * 1000);
}