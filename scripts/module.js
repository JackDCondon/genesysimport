import {GenesysImportDia} from "./importdata.js";

Hooks.once('init', async function() {

});

var filtergenre;
var rootfolderItem;
var rootfolderActor;


Hooks.on("renderSidebarTab", async (app, html) => 
{
    if (app.options.id === "journal" && game.user.isGM) 
    {
        let button = $(`<div class="footer-actions action-buttons flexrow"><button class="create-folder"><i class="fas fa-file-import"></i> Import Genesys JSON </button></div>`)
        button.on('click', async () => 
        {
            const myContent = `<p>Json:<input id="JsonInputID" type="text" value="" /></p>
            <p>RootFolder:<input id="FolderNameID" type="text" value="" /></p>
            <p>Filter:<input id="FilterID" type="text" value="all,science-fiction,android,science fiction" /></p>`;

            new Dialog({
            title: "My Dialog Title",
            content: myContent,
            buttons: 
            {
                button1: 
                {
                    label: "Display Value",
                    callback: (html) => myCallback(html),
                    icon: `<i class="fas fa-check"></i>`
                }
            }

            }).render(true);


        });

        html.find("footer").append(button);
    }
});

Hooks.once('ready', async function() {

});


async function myCallback(html) 
{
    const jsonstring = html.find("input#JsonInputID").val();
    const filterstring = html.find("input#FilterID").val();
    const rootfolderfromhtml = html.find("input#FolderNameID").val();

    filtergenre =  filterstring.split(',');

    rootfolderItem = null;
    rootfolderActor = null;
    if (rootfolderfromhtml != "")
    {
        rootfolderItem = await createOutputFolder(rootfolderfromhtml);
        rootfolderActor = await createOutputFolder(rootfolderfromhtml, true);
    }


    var jsonBook = JSON.parse(jsonstring);
    var moduleName = jsonBook._meta.source.full;
    ui.notifications.info(`Value: ${moduleName}`);

    await CreateSkills(jsonBook);
    await CreateWepQuals(jsonBook);
    await CreateTalents(jsonBook);
    await CreateGearArmorWeapons(jsonBook);
    await CreateCareers(jsonBook);
    await CreateArchetypes(jsonBook);
    await CreateNPCs(jsonBook);

}



async function filterArray(theArray) 
{
    let genrefilter = filtergenre;
    if (genrefilter.length <= 0)
    {
        return theArray;
    }

    return await theArray.filter(InItem => 
    {
        if (InItem.settings == undefined)
        {
            return false;
        }
        for (let settingObj of InItem.settings)
        {
            const SettingName = settingObj.name;
            for (let genre of genrefilter)
            {
                if (genre.toLowerCase() == SettingName.toLowerCase())
                {
                    return true;
                }
            }
        }
        return false;
    });
}


async function CreateNPCs(bookJson) 
{
    ui.notifications.info(`Running NPC Importer`);


    let npcs = bookJson.adversary;
    npcs = await filterArray(npcs);
    let moduleName = bookJson._meta.source.full;
    
    
    console.log("NPC AMOUNT:" + npcs.length);
    let npcCount = 0;
    for (let npc of npcs) {
    
    
        console.log(`adding NPC number ${npcCount++}`, npc);
    
        let source = getSource(moduleName, npc.page);
        let description = "";
        if (npc.description)
        {
            description = formatDesc(npc.description);
        }

        const folderID = await createOutputFolder("NPCs", true, rootfolderActor);

        const foundactor = game.actors.find(f => {
            if (f.folder === null) return false
            return f.name === npc.name && f.folder.id == folderID;
        });
    
    
        let characteristics = npc.characteristics;
        let grantedItems = [];
    
        let npcSKills = npc.skills;
    
        if (npcSKills != null && npcSKills.length > 0) {
    
            for (let skill of npcSKills) {
                //console.log("SKILL:",skill);
                let foundItem = getItem(skill.name);
                //foundItem = game.items.find(f => {
                //    if (f.folder == null) return false
                //    console.assert(f.name && skill.name, "skill");
                //    return f.name.toLowerCase() === skill.name.toLowerCase();
                //});
                if (foundItem == null) {
                    ui.notifications.info("Missing Skill " + skill.name);
                    continue;
                }
    
                foundItem.system.rank = skill.ranks;
                // console.log("Adding Skill " + foundItem.name +" to Architype " + qual.name )
                console.log("SKILL:", foundItem);


                let newskilltoAdd = {
                    name: foundItem.name,
                    img: foundItem.img,
                    type: foundItem.type,
                    system: foundItem.systemData
                };



                grantedItems.push(newskilltoAdd);
            }
    
        }
    
        let architypeAbility = npc.abilities;
    
        if (architypeAbility != null && architypeAbility.length > 0) {
            for (let ability of architypeAbility) {
                if (typeof ability == "string") {
                    ability = { name: ability, description: "" };
                }
                let foundItem = getItem(ability.name);
                //foundItem = game.items.find(f => {
                //    if (f.folder === null) return false
                //    console.assert(f.name && ability.name, "ability");
    
                //    return f.name.toLowerCase() === ability.name.toLowerCase();
                //});
                if (foundItem == null) {
                    let activateType = { type: "passive" };
                    console.log("Making ability..." + ability.name);
                    //console.log(ability.description);
                    let abilDesc = ability.description;
                    console.log("OUTPUT ABILITY DESC:" + abilDesc);
                    let systemData = {
                        description: abilDesc,
                        activation: activateType,
                        source: source
                    };
    
                    let newItemData = {
                        name: ability.name,
                        type: "ability",
                        img: "icons/svg/barrel.svg",
                        system: systemData
                    };
                    foundItem = newItemData;
                    console.log("adding ABILITY:", foundItem);
                }
                // console.log("Adding Ability " + foundItem.name +" to Architype " + qual.name )
                grantedItems.push(foundItem);
            }
        }
    
    
        let architypeTalents = npc.talents;
    
        if (architypeTalents != null && architypeTalents.length > 0) {
    
            for (let talent of architypeTalents) {
                
                let talentString;
                if(typeof talent == "string"){
                    talentString = [...talent.matchAll(/([A-z ]+)(\d*)/g)][0];
                } else {
                    talentString = [talent.name,talent.name];
                }
                
                //console.log("finding talent:", talentString);
    
                let talentName = talentString[1].trim();
                let talentValue = isNaN(talentString[2]) ? 1 : talentString[0][2];
    
                //console.log("talentName:",talentName);
                //console.log("talentValue:",talentValue);
    
                let foundTalent = game.items.find(f => {
                    if (f.folder == null) return false
                    console.assert(f.name && talentName, `talent is bugged ${talentName} trying to match ${f.name}`);
                    return f.name.toLowerCase() === talentName.toLowerCase();
                });
    
                if (foundTalent == null) {
                    ui.notifications.info("Missing Talent " + talentName);
                    continue;
                }
    
                foundTalent.tier = talentValue;
                // console.log("Adding Skill " + foundItem.name +" to Architype " + qual.name )
                console.log("adding TALENT:", foundTalent);
                grantedItems.push(foundTalent);
            }
    
        }
    
        let weaponsList = npc.weapons;
    
        if (weaponsList != null && weaponsList.length > 0) {
            for (let weap of weaponsList) {
                let foundItem = getItem(weap.name);

                if (!foundItem) {
    
                    let qualitiesArray = [];
    
                    for (let qual of weap.qualities ?? []) {
    
                        let qualString = [...qual.matchAll(/([A-z ()]+)(\d*)/g)][0];
                        let qualityValue = isNaN(qualString[2]) ? 1 : qualString[2];
                        let qualityName = qualString[1].trim();
                        let itemMatch = getItem(qualityName, "quality", "skill");
                        //console.log("qualityDesc", qualityDescription);
                        
                        
                        let qualObj;
                        if(qualString.input.match(/([A-z ]+)(\d*) or /g) || itemMatch == null){
                            qualObj = {name: qual, isRated: false};
                        } else {
                            switch (itemMatch.type) {
                                case 'quality':
                                    //make a quality
                                    qualObj = itemMatch;
                                    qualObj.rating = qualityValue;
                                    break;
                                case 'skill':
                                    //make a skill
                                    qualObj = itemMatch;
                                    qualObj.system.rank = qualityValue;
                                    break;
                                default:
                                    console.error("ITEM MATCH TYPE:", itemMatch.type, "NOT HANDLED");
                                    break;
                            }
                        }
    
                        console.log("ADDING:", qualObj);
                        qualitiesArray.push(qualObj);
                    }
    
                    let skillsArray = weap.skill.length > 1 && typeof weap.skill != 'string' ? Object.values(weap.skill) : [weap.skill];
    
                    let systemData = {
                        description: "",
                        source: "",
                        rarity: 100,
                        encumbrance: 0,
                        price: Number(100),
                        damage: "undamaged",
                        container: "",
                        quantity: 1,
                        state: "carried",
                        baseDamage: Number(weap.damage),
                        damageCharacteristic: "-",
                        critical: Number(weap.critical),
                        range: weap.range,
                        skills: skillsArray,
                        qualities: qualitiesArray
                    }
    
                    let itemData = {
                        name: weap.name,
                        type: "weapon",
                        img: "icons/svg/item-bag.svg",
                        system: systemData
                    };
    
    
                    //MAKE ITEM DATA THEN SET IT AS FOUND ITEM
                    foundItem = itemData;
                    console.log("MADE ITEM:", itemData);
                } else {
                    console.log("FOUND ITEM:", foundItem);
                }
                // console.log("Adding Skill " + foundItem.name +" to Architype " + qual.name )
    
                grantedItems.push(foundItem);
            }
    
        }
    
    
    
    
        //console.log("granted Items", grantedItems);

        const strainTH = (npc.derived.strain == undefined ) ? 0 : npc.derived.strain;
        const woundsTH = (npc.derived.wounds == undefined ) ? 0 : npc.derived.wounds;
    
        let systemData = {
            description: description,
            source: source,
            characteristics: characteristics,
            soak: npc.derived.soak,
            defense: { melee: npc.derived.defense[0], ranged: npc.derived.defense[1] },
            groupSize: 1,
            wounds: { value: 0, max: woundsTH },
            strain: { value: 0, max: strainTH }
        };
    
        let newActorData = {
            name: npc.name,
            type: npc.type,
            img: "icons/svg/mystery-man.svg",
            system: systemData,
            folder: folderID
        };
    
    
        let newActor = null;
    
    
    
        //CREATE ACTOR CODE

        if (foundactor) 
        {
           await foundactor.delete();
        }

        newActor = await Actor.create(newActorData);
        //const createditems = await Item.createDocuments(grantedItems, { parent: newActor });

        const createditems = await newActor.createEmbeddedDocuments('Item', grantedItems);


        for (const CreatedItem of createditems)
        {
            if (CreatedItem.type == "skill")
            {
                let foundgranteditems = grantedItems.find(f => {
                    return f.name.toLowerCase() == CreatedItem.name.toLowerCase()
                });
                if (foundgranteditems)
                {
                    //CreatedItem.system.rank = foundgranteditems.system.rank;
                }
                await CreatedItem.update({'system.rank' : foundgranteditems.system.rank});
            }
        }
    
    
    }
    
    ui.notifications.info(`NPC Importer FINISHED`);
    
}

function getItemFromActorOrDB(itemName, actor) 
{
    let founditem = null;
    if (!actor === null)
    {
        founditem = actor.items.getName(itemName);
    }
    if (!founditem === null)
    {
        founditem = getItem(itemName);
    }
    return founditem;
}



function getItem(itemName, itemType) {
    //    const qualityFolder = game.folders.find(f => f.name === folderName);
    console.log("FETCHING ITEM:", `"${itemName}"`);
    //console.log("itemType", itemType);

    const foundItem = game.items.find(f => {
        if (!f.folder) return false;
        //console.assert(f.name && itemName, `getItemDescription name:${f.name} is ${typeof f.name} itemName:${itemName} is ${typeof itemName}`);

        if (arguments.length > 1) {
            for (let i = 1; i < arguments.length; i++) {
                if (arguments[i] === f.type && f.name.toLowerCase() === itemName.toLowerCase()) {
                    //console.log("MATCH:", arguments[i], f.type, "AND", f.name.toLowerCase(), itemName.toLowerCase());
                    return true;
                }
            }
        } else {
            return f.name.toLowerCase() === itemName.toLowerCase();
        }
    });

    if (!foundItem) {
        console.error("CAN'T FIND ITEM DESCRIPTION FOR:", itemName, "RETURNING NULL");
        return null;
    }
    //console.log("itemDescFunc found", foundItem," for ", itemName, itemType);
    console.log("ITEM MATCH:", foundItem);
    return foundItem;
}


async function CreateArchetypes(bookJson) 
{
    ui.notifications.info(`Running Archetype Importer`);

    let archetypes = bookJson.archetype; 
    let moduleName = bookJson._meta.source.full;
    archetypes = await filterArray(archetypes);
    console.log("archetype AMOUNT:" + archetypes.length);
    
    for (let qual of archetypes) {

        //console.log(qual);
    
        let soruce = getSource(moduleName, qual.page);
        let description = formatDesc(qual.description);
    
    
        let folderID = await createOutputFolder("Archetypes", false, rootfolderItem);
        
        
        let characteristics = qual.characteristics;
        let woundThreshold = qual.wt;
        let strainThreshold = qual.st;
        let startingXP = qual.xp;
        let grantedItems = [];
        
        let ArchitypeSkills = qual.skills;
        
        if (ArchitypeSkills != null && ArchitypeSkills.length > 0)
        {
        
            for (let skill of qual.skills)
            {
                foundItem = game.items.find(f => {
                if (f.folder === null) return false
                return f.name.toLowerCase() === skill.name.toLowerCase();
                });
                if (foundItem === null)
                {
                    ui.notifications.info("Missing Skill " + skill.name);
                    continue;
                }
               // console.log("Adding Skill " + foundItem.name +" to Architype " + qual.name )
                grantedItems.push(foundItem);
            }
        
        }
        
        let ArchitypeAbilitie = qual.abilities;
        
        if (ArchitypeAbilitie != null && ArchitypeAbilitie.length > 0)
        {
            for (let abilitie of qual.abilities)
            {
                let foundItem = getItem(abilitie.name);
                //let foundItem = game.items.find(f => {
                //if (f.folder === null) return false
                //return f.name.toLowerCase() === abilitie.name.toLowerCase();
                //});
                if (foundItem == null)
                {
                    let activatetype = { type:"passive" };
                    // console.log("Making ability..." + abilitie.name);
                    //console.log(abilitie.description);
                    let abilDesc = formatDesc(abilitie.description);
                    //console.log("OUTPUT DESC:" + abilDesc);
                        let systemData = {
                        description: abilDesc,
                        activation: activatetype,
                        source: soruce 
                        };
            
                        let newItemData = {
                        name: abilitie.name,
                        type: "ability",
                        img: "icons/svg/barrel.svg",
                        system: systemData 
                        };
                    foundItem = newItemData;
                    console.log(foundItem);
                }
               // console.log("Adding Ability " + foundItem.name +" to Architype " + qual.name )
                grantedItems.push(foundItem);
            }
        }
        
        console.log(grantedItems);
    
        let selectedSkillIDs = [];
    
        let systemData = {
            description: description,
            source: soruce,
            characteristics: characteristics,
            woundThreshold: woundThreshold,
            strainThreshold: strainThreshold,
            startingXP: startingXP,
            grantedItems: grantedItems
        };
    
        let newItemData = {
            name: qual.name,
            type: "archetype",
            img: "icons/svg/barrel.svg",
            system: systemData,
            folder: folderID
        };
    

        await CreateOrUpdateItem(newItemData, folderID);

    
    }
    
    ui.notifications.info(`Archetype Importer FINISHED`);
}


async function CreateCareers(bookJson) 
{
    ui.notifications.info(`Running Careers Importer`);


    if (!bookJson.career) return;

    let careers = bookJson.career;
    
    let moduleName = bookJson._meta.source.full;
    careers = await filterArray(careers);
    
    console.log("Careers AMOUNT:" + careers.length);
    
    for (let qual of careers) 
    {
    
        let soruce = getSource(moduleName, qual.page);
        let description = formatDesc(qual.description);
        let folderID = await createOutputFolder("Careers", false, rootfolderItem);
        
    
        let careerSkills = [];
        
        for (let skill of qual.skills)
        {
            let foundItem = getItem(skill.name);
            //let foundItem = game.items.find(f => {
            //if (f.folder === null) return false
            //return f.name.toLowerCase() === skill.name.toLowerCase();
            //});
            if (foundItem === null)
            {
                ui.notifications.info("Missing Skill " + skill.name);
                continue;
            }
            careerSkills.push(foundItem);
        }
    
        //selectedSkillIDs EMPTY
        let selectedSkillIDs = [];
    
        let systemData = {
            description: description,
            source: soruce,
            careerSkills: careerSkills, 
            selectedSkillIDs: selectedSkillIDs
        };
    
        let newItemData = {
            name: qual.name,
            type: "career",
            img: "icons/svg/barrel.svg",
            system: systemData,
            folder: folderID
        };
        await CreateOrUpdateItem(newItemData, folderID);
    
    }
    
    ui.notifications.info(`Careers Importer FINISHED`);
}



async function CreateGearArmorWeapons(bookJson) 
{
    let moduleName = bookJson._meta.source.full;

    let gearList = bookJson.gear;//all the gear

    gearList = await filterArray(gearList);

    let armorList = gearList.filter(gear => gear.type == "armor");//extract armor
    let weaponList = gearList.filter(gear => gear.type == "weapon");//extract weapon
    let specialAbility = gearList.filter(gear => gear.type == "g-mod" || gear.type == "cybernetic");//extract specialAbility
    gearList = gearList.filter(gear => gear.type == "gear" || gear.type == "g-mod" || gear.type == "cybernetic");//remove everything that isn't gear


    let equipmentFolderID = await createOutputFolder("Equipment", false, rootfolderItem);


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ui.notifications.info(`Started Weapon Importer`);
    for (let weaponItem of weaponList) {

        let folderID = await createOutputFolder("Weapons", false, equipmentFolderID);

        let source = getSource(moduleName, weaponItem.page);
        let description = formatDesc(weaponItem.description);

        let skillsArray = Object.values(weaponItem.skill);
        let qualitiesArray = [];

        for (let qual of weaponItem.special ?? []) {

            console.log("making new item: " + weaponItem.name);
            console.log("Found special: " + qual.name);
            

            let qualityDescription = getItemDescription(qual.name, "quality");
            let qualObj = {
                name: qual.name,
                rating: qual.value ?? 1,
                isRated: !(qual.value == null),//not sure if the true and false are swapped
                description: qualityDescription
            };
            qualitiesArray.push(qualObj);
            //remember the description
        }


        let systemData = {
            description: description,
            source: source,
            rarity: weaponItem.rarity,
            encumbrance: weaponItem.encumbrance,
            price: Number(weaponItem.price),
            damage: "undamaged",
            container: "",
            quantity: 1,
            state: "carried",
            baseDamage: Number(weaponItem.damage),
            damageCharacteristic: "-",
            critical: Number(weaponItem.critical),
            range: weaponItem.range,
            skills: skillsArray,
            qualities: qualitiesArray
        }

        let newItemData = {
            name: weaponItem.name,
            type: "weapon",
            img: "icons/svg/item-bag.svg",
            system: systemData,
            folder: folderID
        };

        await CreateOrUpdateItem(newItemData, folderID);


    }
    ui.notifications.info(`Finished Weapon Importer`);

    ///////////////////////////////////////////////////////////////////////////////////////////////

    ui.notifications.info(`Started Armor Importer`);

    for (let armorItem of armorList) {



        let folderID = await createOutputFolder("Armor", false, equipmentFolderID);

        let source = getSource(moduleName, armorItem.page);
        let description = formatDesc(armorItem.description);

        let qualitiesArray = [];// do any have qualities?

        let systemData = {
            description: description,
            source: source,
            rarity: armorItem.rarity,
            encumbrance: armorItem.encumbrance,
            price: Number(armorItem.price),
            damage: "undamaged",
            container: "",
            quantity: 1,
            state: "carried",//should be worn?
            defense: armorItem.defense,
            soak: Number(armorItem.soak),
            qualities: qualitiesArray
        }

        let newItemData = {
            name: armorItem.name,
            type: "armor",
            img: "icons/svg/item-bag.svg",
            system: systemData,
            folder: folderID
        };

        await CreateOrUpdateItem(newItemData, folderID);



    }

    ui.notifications.info(`Finished Armor Importer`);

    ///////////////////////////////////////////////////////////////////////////////////////////////

    ui.notifications.info(`Started Gear Importer`);

    for (let gearItem of gearList) {


        let subfoldername = "Gear";
        if (gearItem.type != "gear")
        {
            if (gearItem.type == "g-mod") 
            {
                subfoldername = "G Mods" 
            } 
            else if (gearItem.type == "cybernetic") 
            {
                
                subfoldername = "Cybernetics";
            } 
            else
            {
                subfoldername = "Other";
            }
        }

        let folderID = await createOutputFolder(subfoldername, false, equipmentFolderID);

        let source = getSource(moduleName, gearItem.page);
        let description = formatDesc(gearItem.description);

        let systemData = {
            description: description,
            source: source,
            rarity: gearItem.rarity,
            encumbrance: gearItem.encumbrance,
            price: Number(gearItem.price),
            damage: "undamaged",
            container: "",
            quantity: 1,
            state: "carried"
        }

        let newItemData = {
            name: gearItem.name,
            type: "gear",
            img: "icons/svg/item-bag.svg",
            system: systemData,
            folder: folderID
        };

        await CreateOrUpdateItem(newItemData, folderID);

    }

    ui.notifications.info(`Finished Gear Importer`);

    ///////////////////////////////////////////////////////////////////////////////////////////////


    ui.notifications.info(`Started Special Abilitys Importer`);

    for (let sAbility of specialAbility) {


        let parentFolder = await createOutputFolder("Special Abilitys", false, rootfolderItem);

        let subfoldername = "Other";
        if (sAbility.type == "g-mod") subfoldername = "G Mods";
        if (sAbility.type == "cybernetic") subfoldername = "Cybernetics";

        let folderID = await createOutputFolder(subfoldername, false, parentFolder);

        let source = getSource(moduleName, sAbility.page);
        let description = formatDesc(sAbility.description);

        let systemData = {
            description: description,
            source: source
        }

        const abilityName = sAbility.name + " Mod";

        let newItemData = {
            name: abilityName,
            type: "ability",
            img: "icons/commodities/tech/cog-brass.webp",
            system: systemData,
            folder: folderID
        };

        await CreateOrUpdateItem(newItemData, folderID);

    }

    ui.notifications.info(`Finished Special Abilitys Importer`);



}


async function CreateTalents(bookJson) 
{
    ui.notifications.info(`Running Talent Importer`);

    
    let talents = bookJson.talent;
    let moduleName = bookJson._meta.source.full;


    talents = await filterArray(talents);
    for(let qual of talents)
    {
        
        
        let soruce = getSource(moduleName, qual.page);
        let description = formatDesc(qual.description);
        let activation = FindActervation(qual.activation);

        
        let folderID = await createOutputFolder("Talents", false, rootfolderItem);

        
        
        let systemData = {
        description: description ,
        activation: activation ,
        ranked: qual.ranked? "yes" : "no",
        rank:1,
        tier: qual.tier,
        source: soruce 
        };
        
        let newItemData = {
            name: qual.name,
            type: "talent",
            img: "icons/svg/barrel.svg",
            system: systemData ,
            folder: folderID 
        };
        
        await CreateOrUpdateItem(newItemData);
    }

    ui.notifications.info(`Talent Importer FINISHED`);

}


async function CreateWepQuals(bookJson ) 
{

    if (!bookJson.quality) return;
    
    ui.notifications.info(`Running Wep Qual Importer`);
    let wepQual = bookJson.quality;
    let moduleName = bookJson._meta.source.full;

    for(let qual of wepQual)
    {
          
        
        let soruce = getSource(moduleName, qual.page);
        let description = formatDesc(qual.description);
        let activation = qual.activation;
    
        
        let folderID = await createOutputFolder("Weapon Qualities", false, rootfolderItem);
    
        
        
        let systemData = {
        description: description ,
        activation: activation ,
        isRated: false,
        source: soruce 
        };
        
        let newItemData = {
            name: qual.name,
            type: "quality",
            img: "icons/svg/barrel.svg",
            system: systemData ,
            folder: folderID 
        };
        
        
        await CreateOrUpdateItem(newItemData);


    }
    
    ui.notifications.info(`Finished Wep Qual Importer`);
}







async function CreateSkills(json) 
{
    let skills = json.skill;
    var moduleName = json._meta.source.full;

    skills = await filterArray(skills);

    console.log("SKILL AMOUNT:" + skills.length);
    for (let qual of skills) {



        let soruce = getSource(moduleName, qual.page);
        let description = formatDesc(qual.description);
    
    
        let folderID = await createOutputFolder("Skills", false, rootfolderItem);
        
        let systemData = {
            description: description,
            characteristic: qual.characteristic.toLowerCase(),
            category: qual.category,
            initiative: false,
            career: false,
            rank: 0,
            source: soruce
        };
    
        let newItemData = {
            name: qual.name,
            type: "skill",
            img: "icons/svg/barrel.svg",
            system: systemData,
            folder: folderID
        };
    
        await CreateOrUpdateItem(newItemData);

    }

    ui.notifications.info(`Skills Importer FINISHED`);
}


function formatPrice(inprice)
{
    
}

function FindActervation(activatestring)
{
    let newActiv = activatestring.replace(/(active|passive) \((.*?)\)/g, "$1^$2");
    let output = newActiv.split('^');
    
    let outactive = {
        type: output[0],
        detail: ""
        };
        
    if (output.length > 1)
    {
        outactive.detail = output[1];
    }
  
    
    return outactive;
}




async function CreateOrUpdateItem(newitem) 
{
    let foundItem = game.items.find(f => {
        if (f.folder === null) return false
        return f.name === newitem.name && f.folder.id == newitem.folder;
    });
     if (foundItem == undefined) 
     {
         let NewItem = await Item.create(newitem);
     }
      else
     {
         //FoundItem.system.description = "UPDATED YAY WOOOO";
        const updateitem = game.items.get(foundItem.id);
        await updateitem.update({system: newitem.system});

         //let updates = [{_id: foundItem.id , system: newitem.systemData }];
         //const updated = await Item.updateDocuments(updates);
         //FoundItem.update();
         
     }
}




function getItemDescription(itemName, itemType) {
    //    const qualityFolder = game.folders.find(f => f.name === folderName);
    //    console.assert(qualityFolder, `${folderName} folder not found`);
    const foundItem = game.items.find(f => {
        if (!f.folder) return false;
        return f.name.toLowerCase() === itemName.toLowerCase() && f.type === itemType;
    });

    if (foundItem === undefined)
    {
        return [];
    }


    return foundItem.system.description;
}


function getSource(moduleName, page) {
    let prettyName = moduleName + " pg. " + page;
    let outSoruce = "@PDF[" + moduleName + "|page=" + page + "]{" + prettyName + "}";
    return outSoruce;
}


//Takes an array of strings probobly 
function formatDesc(arrayOfDescriptions) {
    let description = "";

    //NEED TO CHECK IF THIS IS AN ARRAY!


    for (let desc of arrayOfDescriptions) {

        if (Array.isArray(desc))
        {
            description += formatDesc(desc);
            continue;
        }
        if (desc.items)
        {
            description += formatDesc(desc.items);
            continue;
        }


        //  Desc = System.Text.RegularExpressions.Regex.Replace(Desc, @"\{@(skill|talent|quality|gear) (.*?)\}", "@Item[$2]");
        //     Desc = System.Text.RegularExpressions.Regex.Replace(Desc, @"\{@(symbols) (.*?)\}", "<span style=\"font-family: Genesys Symbols\">$2</span>");


        //{@title Android: Shadow of the Beanstalk}
        desc = desc.replace(/\{@title (.*?)\}/g, "@PDF[$1]{$1}");



        //{@dice setback}
        //{@dice setback|2}
        //{@dice boost}
        //{@dice boost|2}
        desc = desc.replace(/\{@dice (\w*)\|?(\d)?\}/g, "<b>$2 $1 dice</b>");


        // \{@dice (\w*)\|?(\d)?\} //T

        //{@difficulty hard|Perception}
        //{@difficulty average|leadership}
        desc = desc.replace(/\{@difficulty (\w*)\|([\s\S]*)\}/g, "<b>$1</b> @Item[$2] check");
        desc = desc.replace(/\{@difficulty (\w*)\}/g, "<b>$1</b> check");



        desc = desc.replace(/\|\|(\w)*}/g, "}"); //REMOVE soruce from item ref 
        



        const reg1 = /\{@(skill|talent|quality|gear|rule|optionFeature) (.*?)\}/g;
        const replace1 = "@Item[$2]";
        const reg2 = /\{@(symbols) (.*?)\}/g;
        const replace2 = "<span style=\"font-family: Genesys Symbols\">$2</span>";


        desc = desc.replace(reg1, replace1);
        desc = desc.replace(reg2, replace2);

        //{@i Your character must have purchased the @Item[Inspiring Rhetoric] talent to benefit from this talent}
        desc = desc.replace(/\{@i ([\s\S]*)\}/g, "<b>$1</b>");


        //{@table I.6-3: Spending Threat and Despair in Combat}
        desc = desc.replace(/\{@table (.*?)\}/g, "@PDF[Genesys Core Rulebook]{$1}");


        //{@b Models Include:}  
        desc = desc.replace(/\{@b ([\s\S]*)\}/g, "<b>$1</b>");

         //{@charactieristic Brawn}

         desc = desc.replace(/\{@charactieristic ([\S]*)\}/g, "<b>$1</b>");


        desc = "<p>" + desc + "</p>";
        description += desc;
    }
    return description;
}


async function createOutputFolder(nameInput, isActor = false, parentID = null) {
    let outputFolder;
    let name = nameInput;
    let type = isActor? "Actor":"Item";

    outputFolder = game.folders.find(f => 
    {
        if (f.name === name && f.type == type)
        {
            if (f.folder == undefined || f.folder == null) return true;
            if (f.folder.id == undefined || f.folder.id == null) return true
            return (f.folder.id == parentID);
        }
    });

    if (!outputFolder) 
    {
        outputFolder = await Folder.create({
            'name': name,
            'type': type,
            'parent': parentID
        });
        ui.notifications.info(`Created Wep Qual Folder`);
    }

    return outputFolder.id;
}