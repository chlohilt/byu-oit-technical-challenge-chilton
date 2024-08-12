/**
 * @file This file holds functions dealing with the persons API and the student's schedule from AcademicRegistrationStudentSchedule
 * @author Chloe Hilton <hilton.chloe.y@gmail.com>
 * March 10, 2022
 */

const axios = require("axios")

/**
 * this function holds place where the persons information is at
 * @param apiKey
 * @param idNumber
 * @returns {{headers: {Authorization: string}, method: string, url: string}}
 */
const persons = (apiKey, idNumber) => {
    return {
        url: "https://fakeUrl/" + idNumber,
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`
        }
    }

}


/**
 * this function returns the url for the academic registration student schedule, to be used in checkId function
 * @param apiKey
 * @param personId
 * @returns {{headers: {Authorization: string}, method: string, url: string}}
 */
const studentSchedule = (apiKey, personId) => {
    return {
        url: "https://fakeUrl/" + personId + "/20221",
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`
        }
    }
}


/**
 * this function checks that the person's API key and BYU ID match up and gets class times and days of the week
 * @param apiKey
 * @param personId
 * @returns {Promise<void>}
 */
checkId = async function(apiKey, personId) {
    try {
        const info = await axios(studentSchedule(apiKey, personId))
    } catch (err) {
        if (err.response.headers["error-code"] === "2"){ // this number has to be 2 because that's the only error that checks if BYU ID and API key don't match
            console.log("\nThat BYU ID and API key do not match. Please try again.\n")
        }
        else if (err.response.status === 403) { // this error number is the one that comes up when you're not subscribed to AcademicRegistration
            console.log("\nIt looks like you are not subscribed to the AcademicRegistrationStudentSchedule - v1 API. Please subscribe and try again.\n")
        }
        process.exit(0)
    }
}


/**
 * this function gets the persons name then welcomes them to the program
 * @param persons
 * @param apiKey
 * @returns {Promise<void>}
 */
const getPublicInfo = async function(persons, apiKey) {
    try {
        const info = await axios(persons)
        const name = info.data.basic.preferred_name.value
        const personId = info.data.basic.person_id.value
        await checkId(apiKey, personId)
        console.clear()
        console.log("\nHello, " + name)
        return personId
    }
    catch(err) {
        if (err.response.status === 403) { // this error number is the one that comes up when the user isn't subscribed to Persons
            console.log("\nIt looks like you are not subscribed to the Persons - v3 API. Please subscribe and try again.\n")
        }
        else if (err.response.status === 401) { // this is the error number that comes up when the user puts in an incorrect API key
            console.log("\nIt looks like you have inputted an incorrect API key. Please try again.\n")
        }
        else if (err.response.status === 404) { // this is the error number that comes up when the user inputs an incorrect BYU ID
            console.log("\nSorry, that resource is not available. You may have inputted an incorrect BYU ID. Please try again.\n")
        }
        process.exit(0)
    }
}

module.exports = {studentSchedule, persons, getPublicInfo}
