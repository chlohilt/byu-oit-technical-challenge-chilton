/**
 * @file This file holds the main function that controls the main flow of the program
 * @author Chloe Hilton <hilton.chloe.y@gmail.com>
 * March 10, 2022
 */

const oracleObj = require("./oracle")
const {getPublicInfo, persons} = require("./publicInfoApi");
const {askByuId, askApiKey, mainMenu, mainMenuGuts} = require("./menuFunctions")

/**
    * This function controls the main flow of the program
    * @param N/A
    * @returns {Promise<void>}
 */
async function main() {
    try {
        // test that VPN is turned on and AWS credentials
        await oracleObj.getOracleCredentials()
        await oracleObj.testVpn()
        // get API key and net ID
        let apiKey = await askApiKey()
        let byuId = await askByuId()
        while (byuId.length !== 9 || typeof(byuId) !== "string") { // the number 9 is used here because all BYU IDs have a length of 9, so if it's less than 9 I have to have them try again
            console.log("\nThat is not a correct BYU ID. Please try again.\n")
            byuId = await askByuId()
        }
        await getPublicInfo(persons(apiKey, byuId), apiKey)
        // welcome user to the program
        console.log("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
        "WELCOME TO BYU ACTIVITY FINDER\n" +
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")

        // get info on the user
        // ask what event they want
        let userInput = await mainMenu()
        await mainMenuGuts(userInput, byuId, apiKey)

        // while the user input is not quit, keep running loop
        while (userInput !== "QUIT") {
            console.clear()
            console.log("!!!!!!!!!!!!!!!!!!! " +
                "\nBYU ACTIVITY FINDER\n" +
                "!!!!!!!!!!!!!!!!!!!")
            userInput = await mainMenu()
            await mainMenuGuts(userInput, byuId, apiKey)
        }
        await oracleObj.clearTable("OIT#CHLOEHI.EVENT_TABLE", byuId)
        console.log("\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
            "THANKS FOR USING BYU ACTIVITY FINDER" +
            "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")

    } catch (e) {
        if (e.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
        }
        process.exit(0)
    }
}

main()