import got from 'got';
import graphqlRequest from "./graphql-request.mjs";

const gameData = {
    maps: false,
    traders: false,
    hideout: false,
    flea: false,
    skills: [
        {
            id: 'hideoutManagement',
            name: 'Hideout Management'
        },
        {
            id: 'crafting',
            name: 'Crafting'
        }
    ]
};

const mapKeys = {
    '5b0fc42d86f7744a585f9105': 'labs',
    '59fc81d786f774390775787e': 'factory'
};

let mapChoices = [];
let traderChoices = [];
let hideoutChoices = [];

export async function updateMaps() {
    const query = `query {
        maps {
            id
            tarkovDataId
            name
            wiki
            description
            enemies
            raidDuration
            players
        }
    }`;
    // add players to query
    const responses = await Promise.all([
        graphqlRequest({ graphql: query }), 
        got('https://raw.githubusercontent.com/the-hideout/tarkov-dev/master/src/data/maps.json', {
            responseType: 'json',
            headers: { "user-agent": "stash-tarkov-dev" }
        })
    ]);
    gameData.maps = responses[0].data.maps;

    mapChoices.length = 0;
    for (const mapData of gameData.maps) {
        mapChoices.push([mapData.name, mapData.id]);
    }
    mapChoices = mapChoices.sort();

    const mapImages = responses[1].body;
    for (const mapData of gameData.maps) {
        let testKey = mapData.name.toLowerCase();
        if (mapKeys[mapData.id]) testKey = mapKeys[mapData.id];
        for (const mapImage of mapImages) {
            if (mapImage.key !== testKey) continue;
            mapData.key = testKey;
            mapData.source = mapImage.source;
            mapData.sourceLink = mapImage.sourceLink;
            //mapData.players = mapImage.players;
            break;
        }
    }
    return gameData.maps;
};

export async function getMaps() {
    if (gameData.maps) {
        return gameData.maps;
    }
    return updateMaps();
};

export async function updateTraders() {
    const query = `query {
        traders {
            id
            tarkovDataId
            name
            resetTime
            discount
            levels {
                id
                level
                payRate
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.traders = response.data.traders;

    traderChoices.length = 0;
    for (const traderData of gameData.traders) {
        traderChoices.push([traderData.name, traderData.id]);
    }
    traderChoices = traderChoices.sort();

    return gameData.traders;
};

export async function getTraders() {
    if (gameData.traders) {
        return gameData.traders;
    }
    return updateTraders();
};

export async function updateHideout() {
    const query = `query {
        hideoutStations {
            id
            tarkovDataId
            name
            levels {
                id
                tarkovDataId
                level
            }
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.hideout = response.data.hideoutStations;

    hideoutChoices.length = 0;
    for (const hideoutData of gameData.hideout) {
        hideoutChoices.push([hideoutData.name, hideoutData.id]);
    }
    hideoutChoices = hideoutChoices.sort();

    return gameData.hideout;
};

export async function getFlea() {
    if (gameData.flea) {
        return gameData.flea;
    }
    return updateFlea();
};

export async function updateFlea() {
    const query = `query {
        fleaMarket {
            minPlayerLevel
            enabled
            sellOfferFeeRate
            sellRequirementFeeRate
        }
    }`;
    const response = await graphqlRequest({ graphql: query });
    gameData.flea = response.data.fleaMarket;

    return gameData.flea;
};

export async function getHideout() {
    if (gameData.hideout) {
        return gameData.hideout;
    }
    return updateHideout();
};

const updateAll = async () => {
    await Promise.allSettled([
        updateMaps(),
        updateTraders(),
        updateHideout()
    ]);
};

let updateInterval = false;

if (process.env.NODE_ENV !== 'ci') {
    updateInterval = setInterval(updateAll, 1000 * 60 * 10);
    updateInterval.unref();
}

export default {
    maps: {
        getAll: getMaps,
        update: updateMaps,
        choices: () => {
            return mapChoices;
        }
    },
    traders: {
        getAll: getTraders,
        get: async id => {
            const traders = await getTraders();
            for (const trader of traders) {
                if (trader.id == id || trader.tarkovDataId == id) return trader;
            }
            return false;
        },
        update: updateTraders,
        choices: includeAllOption => {
            if (!includeAllOption) return traderChoices;
            return [
                ...traderChoices,
                ['All', 'all']
            ];
        }
    },
    hideout: {
        getAll: getHideout,
        get: async id => {
            const stations = await getHideout();
            for (const station of stations) {
                if (station.id == id || station.tarkovDataId == id) return station;
            }
            return false;
        },
        update: updateHideout,
        choices: includeAllOption => {
            if (!includeAllOption) return hideoutChoices;
            return [
                ...hideoutChoices,
                ['All', 'all']
            ];
        }
    },
    skills: {
        getAll: () => {
            return gameData.skills;
        },
        get: async id => {
            for (const skill of gameData.skills) {
                if (skill.id == id) return skill;
            }
            return false;
        },
        choices: includeAllOption => {
            const choices = gameData.skills.map(skill => {
                return [skill.name, skill.id]
            });
            if (!includeAllOption) return choices;
            return [
                ...choices,
                ['All', 'all']
            ];
        }
    },
    flea: {
        get: getFlea,
        update: updateFlea
    },
    load: () => {
        return Promise.all([
            getMaps(),
            getTraders(),
            getHideout(),
            getFlea()
        ]);
    }
};