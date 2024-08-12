/**
 * @file This file holds all of the functions needed for the main menu
 * @author Chloe Hilton <hilton.chloe.y@gmail.com>
 * March 10, 2022
 */
const inquire = require("inquirer");
const {getCalendar} = require("./calendarApi");
const {printTable, addToMyEventsTable, printDescriptionEvent, clearTable, deleteEventFromMyEvents} = require("./oracle");

/**
 * This function asks for the user's BYU ID
 * @returns {Promise<*>}
 */
async function askByuId() {
    const questions = {
        type: "input",
        name: "byuId",
        message: "What is your BYU ID?"
    }

    const answer = await inquire.prompt(questions)
    return answer.byuId
}


/**
 * This function asks for the user's API Bearer Token
 * @returns {Promise<string>}
 */
async function askApiKey() {
    const questions ={
        type: "input",
        name: "ApiKey",
        message: "What is your API Key?"
    }

    const answer = await inquire.prompt(questions)
    return answer.ApiKey
}


/**
 * This function gives the options for the main menu
 * @returns {Promise<*>}
 */
async function mainMenu() {
    const options = ["Browse Events", "View My Events", "QUIT"]

    const questions = {
        type: "list",
        name: "menu",
        message: "\nPlease choose an option:",
        choices: options
    }

    const answer = await inquire.prompt(questions)
    return answer.menu
}


/**
 * This function gives the options for the event categories
 * @returns {Promise<*>}
 */
async function askEventMenu() {
    const options = ["Education", "Conferences", "Athletics", "Arts & Entertainment", "Major Conferences", "Student Life",
        "Health and Wellness", "Other", "BACK"]
    const questions = {
        type: "list",
        name: "menu",
        pageSize: 10, // the number 10 here is the size of the menu so it can hold all of them at once and you don't have to scroll
        message: "What type of event are you looking for? Select BACK to go back to the main menu.",
        choices: options
    }

    const answer = await inquire.prompt(questions)
    return answer.menu
}


/**
 * This function asks for the index of the event the user will be deleting
 * @returns {Promise<*>}
 */
async function getDelete() {
    const options = ["See More Information on an Event", "Delete an Event", "Delete All Events", "BACK"]
    const questions = {
        type: "list",
        name: "eventIndex",
        message: "\nPlease choose an option:",
        choices: options
    }

    const answer = await inquire.prompt(questions)
    return answer.eventIndex
}


/**
 * This function asks for the index of the event the user will be deleting
 * @returns {Promise<*>}
 */
async function getEventIndexDelete() {
    const questions = {
        type: "input",
        name: "eventIndex",
        message: "\nTo delete, please type the index of event from the table or press the Enter key to get back\n"
    }

    const answer = await inquire.prompt(questions)
    return answer.eventIndex
}


/**
 * this function checks if the user would like to go back after seeing more information in the delete section of My Events
 * @returns {Promise<*>}
 */
async function getBack() {
    const question = {
        type: "input",
        name: "backOrNo",
        message: "\nOnce you have finished viewing the information, press Enter to get back.\n"
    }

    const answer = await inquire.prompt(question)
    return answer.backOrNo
}

/**
 * This function asks for the index of the event the user will be getting more info for and maybe adding
 * @returns {Promise<*>}
 */
async function getEventIndexInfo() {
    const questions = {
        type: "input",
        name: "eventIndex",
        message: "\nTo see more information and/or add, please type the index of event from the table or press the Enter key to get back.\n"
    }

    const answer = await inquire.prompt(questions)
    return answer.eventIndex
}


/**
 * this function returns what event the would like to see more info for in my events
 * @returns {Promise<*>}
 */
async function getEventIndexInfoView() {
    const questions = {
        type: "input",
        name: "eventIndex",
        message: "\nTo see more information, please type the index of event from the table or press the Enter key to get back.\n"
    }

    const answer = await inquire.prompt(questions)
    return answer.eventIndex
}

/**
 * this function asks if they would like to add the event to My Events after seeing more info on it
 * @returns {Promise<*>}
 */
async function addAfterInfo() {
    const question = {
        type: "confirm",
        name: "addOrNot",
        message: "\nWould you like to add this event to My Events?\n"
    }

    const answer = await inquire.prompt(question)
    return answer.addOrNot
}


/**
 * This function works with clearing the screen so the user has time to read before the screen clears
 * @param delay
 * @returns {Promise<unknown>}
 */
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))


/**
 * This function sets up how the main menu will run and sets up tables and such
 * @param userInput -- user's choice for main menu
 * @param byuId
 * @param apiKey
 * @return {Promise<void>}
 */
async function mainMenuGuts(userInput, byuId, apiKey) {
    let sleepTime = 3000
    if (userInput === "Browse Events") {
        let userEventInput = await askEventMenu()
        while (userEventInput !== "BACK") {
            await clearTable("OIT#CHLOEHI.EVENT_TABLE", byuId)
            if (userEventInput === "BACK"){
                break
            } else {
                // add event info to table
                try {
                    if (await getCalendar(userEventInput, byuId) !== "no print"){
                        console.log(userEventInput.toUpperCase() + "\n")
                        await printTable("OIT#CHLOEHI.EVENT_TABLE", byuId, apiKey)
                        // add to my events to user
                        let addIndex = await getEventIndexInfo()
                        while (addIndex !== "") {
                            try {
                                if (await printDescriptionEvent(addIndex, "OIT#CHLOEHI.EVENT_TABLE") === "printed"){
                                    let addEvent = await addAfterInfo()
                                    if (addEvent) {
                                        await addToMyEventsTable(Number(addIndex))
                                        await sleep(sleepTime)
                                    }
                                    console.clear()
                                    await printBrand()
                                    console.log(userEventInput.toUpperCase() + "\n")
                                    await printTable("OIT#CHLOEHI.EVENT_TABLE", byuId, apiKey)
                                    addIndex = await getEventIndexInfo()
                                } else {
                                    await sleep(sleepTime)
                                    addIndex = await getEventIndexInfo()
                                }
                            } catch (e) {
                                if (e.errorNum === 12170){
                                    console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
                                    process.exit(0)
                                } else {
                                    console.log("\nThat index is not recognizable. Please try again. \n")
                                }
                            }
                        }

                    }
                } catch (err) {
                    if (err.errorNum === 12170) {
                        console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
                        process.exit(0)
                    } else {
                        console.log("\nThat input is not recognizable. Please try again.\n")
                    }
                }
            }
            console.log("Time to look at other events!\n")
            await sleep(sleepTime)
            console.clear()
            await printBrand()
            userEventInput = await askEventMenu()
        }
    } else if (userInput === "View My Events") {
        await sleep(sleepTime)
        console.clear()
        await printBrand()
        console.log("MY EVENTS\n")
        let print = await printTable("OIT#CHLOEHI.MY_EVENTS", byuId,apiKey)
        let userMyEventInput
        if (print === "printed"){
            userMyEventInput = await getDelete()
        } else {
            await sleep(sleepTime)
            userMyEventInput = "BACK"
            await printBrand()
        }
        while (userMyEventInput !== "BACK") {
            if (userMyEventInput === "Delete an Event") {
                let index = await getEventIndexDelete()
                await deleteEventFromMyEvents(index, byuId)
                await sleep(sleepTime)
                userMyEventInput =  await gutsPart2(byuId,apiKey, userMyEventInput)

            } else if (userMyEventInput === "Delete All Events") {
                await clearTable("OIT#CHLOEHI.MY_EVENTS", byuId)
                console.log("\nMy Events cleared.\n")
                await sleep(sleepTime)
                userMyEventInput = "BACK"
            } else if (userMyEventInput === "See More Information on an Event") {
                let seeInfo = await getEventIndexInfoView()
                while (seeInfo !== "") {
                    if(await printDescriptionEvent(seeInfo, "OIT#CHLOEHI.MY_EVENTS") === "printed"){
                        seeInfo = await getBack()
                    }
                    else {
                        await sleep(sleepTime)
                        seeInfo = ""
                    }
                }
                userMyEventInput =  await gutsPart2(byuId, apiKey, userMyEventInput)
                }
            }
        }else if (userInput === "QUIT"){
        console.log("\nHave a great day :)")
    }else {
        console.log("\nThat input is not recognized. Please try again.\n")
    }
}


/**
 * this function keeps the printTable function a bit shorter
 * @param byuId
 * @param apiKey
 * @param userMyEventInput
 * @returns {Promise<string>}
 */
const gutsPart2 = async function gutsPart2(byuId, apiKey, userMyEventInput) {
    let sleepTime = 3000 // 3000 milliseconds for 3 seconds
    try {
        console.clear()
        console.log("MY EVENTS\n")
        let print = await printTable("OIT#CHLOEHI.MY_EVENTS", byuId, apiKey)
        if (print === "printed") {
            userMyEventInput = await getDelete()
            return userMyEventInput
        } else {
            await sleep(sleepTime)
            userMyEventInput = "BACK"
            await printBrand()
            return userMyEventInput
    }
    } catch (e) {
        if (e.errorNum === 12170) {
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        } else {
            console.log("\nThat input is not recognizable. Please try again.\n")
        }
    }
}


const printBrand = async function printBrand() {
    console.log("!!!!!!!!!!!!!!!!!!! " +
        "\nBYU ACTIVITY FINDER\n" +
        "!!!!!!!!!!!!!!!!!!!\n")
}

module.exports = {askByuId, askApiKey, mainMenu, mainMenuGuts, sleep}