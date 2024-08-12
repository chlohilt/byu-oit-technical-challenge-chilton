/**
 * @file This file holds functions that interact with the Oracle database and the tables
 * @author Chloe Hilton <hilton.chloe.y@gmail.com>
 * March 10, 2022
 */

const AWS = require("aws-sdk")
AWS.config.update({ region:"us-west-2" })
const ssm = new AWS.SSM()
const oracle = require("oracledb")
oracle.outFormat = oracle.OBJECT
oracle.autoCommit = true
const axios = require("axios")
const publicInfo = require("./publicInfoApi")
const convertTime = require("convert-time")
const wrap = require('word-wrap');


/** parameter for oracle database
 * @type {{Names: string[], WithDecryption: boolean}}
 */
let parameters = {
    Names: ["/ch-technical-application/dev/USERNAME", "/ch-technical-application/dev/PASSWORD"],
    WithDecryption: true
}


/** holds connect string for the database
 * @type {{connectString: string}}
 */
let params = {
    connectString: "fakeConnectString"
};


/**
    * this function sets the username and password in the params object
    * @param username taken from oracle
    * @param password taken from oracle
 */
const setOracleCredentials = (username, password) => {
    params.user = username
    params.password = password
}



/**
 * this function checks if the user is logged into AWS
 * @returns {Promise<void>}
 */
const getOracleCredentials = async function() {
    try {
        let firstParams = await ssm.getParameters(parameters).promise()
        setOracleCredentials(firstParams.Parameters[1].Value, firstParams.Parameters[0].Value)
    } catch (err) {
        if (err.errno === -4062) { // this is the error number that says they aren't logged into AWS
            console.log("\nIt looks like you're not logged into AWS. Please log into AWS and try again.\n")
        } else if (err.statusCode === 400) { // this error number also says they aren't logged into AWS, have to catch them all
            console.log("\nIt looks like you're not logged into AWS. Please log into AWS and try again.\n")
        } else if (err.code === "CredentialsError") {
            console.log("\nIt looks like you're not logged into AWS. Please log into AWS and try again.\n")
        }
        process.exit(0)
    }
}


/**
 * this function checks that the VPN is on
 * @returns {Promise<string>}
 */
const testVpn = async function(){
    try {
        console.log("Checking that your VPN is on -- please wait")
        const conn = await oracle.getConnection(params)
        await conn.execute('SELECT * FROM DUAL')
        await conn.close()
        console.log("VPN status confirmed.\n")
    } catch(e) {
        console.error("\nUnable to create a connection to database; please turn on your VPN before using this program.\n")
        process.exit(0)
    }
}


/**
 * this function adds events to the oracle event table
 * @param title
 * @param description
 * @param location
 * @param price
 * @param startTime
 * @param dayOfWeek
 * @param byuId
 * @param category
 * @param url
 * @returns {Promise<void>}
 */
const addToEventTable = async function addToEventTable(title, startTime, description, location, price, dayOfWeek, byuId, category, url) {
    try {
        const conn = await oracle.getConnection(params)
        await conn.execute('INSERT INTO OIT#CHLOEHI.EVENT_TABLE ' +
            '(NAME' +
            ',START_TIME' +
            ',PRICE' +
            ',DESCRIPTION' +
            ',URL' +
            ',LOCATION' +
            ',DAY_OF_WEEK' +
            ',BYU_ID' +
            ', CATEGORY) ' +
            'VALUES ' +
            '(:title' +
            ',:startTime' +
            ',:price' +
            ',:description' +
            ',:url' +
            ',:location' +
            ',:dayOfWeek' +
            ',:byuId' +
            ', :category)',
            [title
            ,startTime
            ,price
            ,description
            ,url
            ,location
            ,dayOfWeek
            ,byuId
            , category])
        await conn.close()

    } catch(err) {
        if (err.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
    }
}


/**
 * this function sorts the events based on time
 * @param x
 * @param y
 * @returns {number}
 */
function sortArray(x,y){
    if(x["Start Time"] < y["Start Time"]){
        return -1
    }
    if(x["Start Time"] > y["Start Time"]){
        return 1
    }
    return 0;
}


/**
 * this function sorts the events based on added to table
 * @param x
 * @param y
 * @returns {number}
 */
function sortAdd(x,y){
    if(x["Date Added to My Events"] > y["Date Added to My Events"]){
        return -1
    }
    if(x["Date Added to My Events"] < y["Date Added to My Events"]){
        return 1
    }
    return 0;
}

/**
 * this function gets the user's person ID
 * @param apiKey
 * @param byuId
 * @returns {Promise<*>}
 */
const getPersonId = async function(apiKey, byuId) {
    try {
        const personInfo = await axios(publicInfo.persons(apiKey, byuId))
        return personInfo.data.basic.person_id.value
    }
    catch(err) {
        if (err.response.status === 403) { // this is the error number that comes up when the user isn't subscribed to Persons
            console.log("\nIt looks like you are not subscribed to the Persons - v3 API. Please subscribe and try again.\n")
        }
        else if (err.response.status === 401) { // this is the error number that comes up when the user inputs an incorrect API key
            console.log("\nIt looks like you have inputted an incorrect API key. Please try again.\n")
        }
        else if (err.response.status === 404) { // this is the error number that comes up when the user inputs an incorrect API
            console.log("\nSorry, that resource is not available. You may have inputted an incorrect BYU ID. Please try again.\n")
        } else if (err.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
        }
        process.exit(0)
    }
}


/**
 * this function prints the oracle tables and checks if the user's classes clash with the event times
 * @param tableName
 * @param byuId
 * @param apiKey
 * @returns {Promise<string>}
 */
const printTable = async function printTable(tableName, byuId, apiKey) {
    try {
        const conn = await oracle.getConnection(params)
        const classList = []
        let personId = await getPersonId(apiKey, byuId)
        const myInfo = await axios(publicInfo.studentSchedule(apiKey, personId))
        let schedule = myInfo.data.WeeklySchedService.response.schedule_table
        for (let i = 0; i < schedule.length; ++i) {
            let classTimes = schedule[i].class_period
            for (let j = 0; j < classTimes.length; ++j) {
                if (classTimes[j] === " ") {
                    let startClass = classTimes.slice(0, j) + "m"
                    let endClass = classTimes.slice(j + 3, classTimes.length) + "m"
                    // here get the days and convert it to numbers
                    let days = schedule[i].days
                    let dict = {
                        "startClass": startClass.toString(),
                        "endClass": endClass.toString(),
                        "days": days.toString()
                    }
                    classList.push(dict)
                    break
                }
            }
        }
        let count = await conn.execute(`SELECT COUNT(*) FROM ${tableName} WHERE BYU_ID = ${byuId}`)
        if (count.rows[0]['COUNT(*)'] !== 0 && tableName === "OIT#CHLOEHI.EVENT_TABLE") {
            for (let t = 0; t < 2; ++t) {
                if (myInfo.data.WeeklySchedService.response["enrolled"] !== "You are not currently enrolled for any classes.") {
                    for (let i = 0; i < classList.length; ++i) {
                        let classDays = classList[i]["days"]
                        let startClass = classList[i]["startClass"]
                        let endClass = classList[i]["endClass"]
                        let np = "no print"
                        for (let j = 0; j < count.rows[0]["COUNT(*)"]; ++j) {
                            let filler = await conn.execute('SELECT START_TIME, DAY_OF_WEEK, BYU_ID, NAME FROM OIT#CHLOEHI.EVENT_TABLE')
                            let eventStartTime = filler.rows[j]['START_TIME'].substring(11, filler.rows[j]['START_TIME'].length)
                            eventStartTime = eventStartTime.replace(" ", "")
                            let eventDay = filler.rows[j]['DAY_OF_WEEK']
                            let id = filler.rows[j]['BYU_ID']
                            let name = filler.rows[j]['NAME']
                            if (classDays.includes(eventDay) && await checkEventTime(eventStartTime, startClass, endClass)) {
                                await conn.execute('UPDATE OIT#CHLOEHI.EVENT_TABLE ' +
                                    `SET DAY_OF_WEEK = '${np}' ` +
                                    `WHERE START_TIME = ${filler.rows[j]['START_TIME']} AND BYU_ID = ${id} AND NAME = ${name}`)
                            }
                        }
                    }
                }
            }
        }
        let np = "no print"
        let table
        if (tableName === "OIT#CHLOEHI.EVENT_TABLE") {
                await conn.execute('DELETE FROM OIT#CHLOEHI.EVENT_TABLE ' +
                    `WHERE DAY_OF_WEEK = '${np}'`)
                table = await conn.execute('SELECT ' +
                'NAME AS "Name"' +
                ',DESCRIPTION AS "Description" ' +
                ',LOCATION AS "Location" ' +
                ',PRICE AS "Price" ' +
                `,START_TIME AS "Start Time" FROM ${tableName} ` +
                `WHERE DAY_OF_WEEK != '${np}'`)
        } else if (tableName === "OIT#CHLOEHI.MY_EVENTS") {
            table = await conn.execute('SELECT ' +
                'DATE_ADDED AS "Date Added to My Events" ' +
                ',CATEGORY AS "Category" ' +
                ',NAME AS "Name" ' +
                ',DESCRIPTION AS "Description" ' +
                ',LOCATION AS "Location" ' +
                ',PRICE AS "Price" ' +
                `,START_TIME AS "Start Time" FROM ${tableName} ` +
            `WHERE BYU_ID = ${byuId}`)
        }
        let eventCount = await conn.execute(`SELECT COUNT(*) FROM OIT#CHLOEHI.MY_EVENTS WHERE BYU_ID = ${byuId}`)
        if (count.rows[0]['COUNT(*)'] === 0 && tableName === "OIT#CHLOEHI.MY_EVENTS") {
            console.log("\nThere are no events in My Events. Go to Browse Events to add some.\n")
            return "not printed"
        }else if(eventCount.rows[0]['COUNT(*)'] === 0 && tableName === "OIT#CHLOEHI.EVENT_TABLE") {
            table.rows = table.rows.sort(sortArray)
            console.table(table.rows, ["Name", "Start Time", "Price", "Location"])
            await conn.close()
        }else {
            table.rows = table.rows.sort(sortArray)
            if (tableName === "OIT#CHLOEHI.MY_EVENTS"){
                console.table(table.rows, ["Name", "Start Time", "Price", "Location", "Category", "Date Added to My Events"])
                await conn.close()
            }
            else if (tableName === "OIT#CHLOEHI.EVENT_TABLE"){
                console.table(table.rows, ["Name", "Start Time", "Price", "Location"])
                let eventAdd = await conn.execute('SELECT ' +
                    'NAME AS "Name" ' +
                    ',DATE_ADDED AS "Date Added to My Events" FROM OIT#CHLOEHI.MY_EVENTS ' +
                    `WHERE BYU_ID = ${byuId}`)
                eventAdd.rows = eventAdd.rows.sort(sortAdd)
                console.log("\nThe last event you added to My Events was " + eventAdd.rows[0]["Name"] + "\n")
                await conn.close()
            }
            return "printed"
        }
    } catch(err) {
        if (err.response.status === 403) { // this is the error code that comes up when they are not subscribed to AcademicRegistrationStudentSchedule
            console.log("\nIt looks like you are not subscribed to the AcademicRegistrationStudentSchedule - v1 API. Please subscribe and try again.\n")
        }
        else if (err.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
        process.exit(0)
    }
}


/**
 * this function checks if the event is after the class starts
 * @param eventStartTime
 * @param startClass
 * @param endClass
 * @returns {Promise<boolean>}
 */
async function checkEventTime(eventStartTime, startClass, endClass) {
    let eventClash = false
    eventStartTime = convertTime(eventStartTime, "hh:MM")
    startClass = convertTime(startClass, "HH:MM")
    endClass = convertTime(endClass, "HH:MM")
    if (startClass <= eventStartTime && eventStartTime < endClass) {
        eventClash = true
    }
    return eventClash
}


/**
 * this function clears the tables
 * @param nameOfTable
 * @param byuId
 * @returns {Promise<void>}
 */
const clearTable = async function deleteFromTable(nameOfTable, byuId) {
    try {
        const conn = await oracle.getConnection(params)
        // clears table from past runs
        if (nameOfTable === "OIT#CHLOEHI.EVENT_TABLE") {
            await conn.execute(`TRUNCATE TABLE ${nameOfTable}`)
        } else if (nameOfTable === "OIT#CHLOEHI.MY_EVENTS") {
            await conn.execute(`DELETE FROM ${nameOfTable} ` +
                `WHERE BYU_ID = ${byuId}`)
        }

        await conn.close()
    } catch (e) {
        if (e.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
    }
}


/**
 * this function deletes an event from My Events feature
 * @param index
 * @param byuId
 * @returns {Promise<void>}
 */
const deleteEventFromMyEvents = async function deleteEventFromMyEvents(index, byuId) {
    const conn = await oracle.getConnection(params)
    try {
        let count = await conn.execute(`SELECT COUNT(*) FROM OIT#CHLOEHI.MY_EVENTS WHERE BYU_ID = ${byuId}`)
        let primaryKeyCheck = await conn.execute(`SELECT NAME, BYU_ID, START_TIME FROM OIT#CHLOEHI.MY_EVENTS WHERE BYU_ID = ${byuId}`)
        primaryKeyCheck.rows = primaryKeyCheck.rows.sort(sortArray)
        let start = primaryKeyCheck.rows[index]['START_TIME']
        let id = primaryKeyCheck.rows[index]['BYU_ID']
        let name = primaryKeyCheck.rows[index]['NAME']
        if (index >= count.rows[0]['COUNT(*)'] || index < 0) {
            console.log("\nThat index number is not valid. Please try again.\n")
        } else if (index === "b") {
            console.log("Back to the menu!\n")
        } else{
            conn.execute('DELETE FROM OIT#CHLOEHI.MY_EVENTS ' +
                `WHERE START_TIME = '${start}' AND BYU_ID = '${id}' AND NAME = '${name}'`)
                console.log("\nEvent successfully taken off My Events.\n")
        }
        await conn.close()
    } catch(e) {
        if (e.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
        else {
            console.log("\nThat index number is not valid. Please try again.\n")
        }
    }

}


/**
 * this function adds an event onto my events table and checks the primary key for duplicates
 * @param index
 * @returns {Promise<void>}
 */
const addToMyEventsTable = async function addToMyEventsTable(index) {
    const conn = await oracle.getConnection(params)
    try {
        let eventsCount = await conn.execute('SELECT COUNT(*) FROM OIT#CHLOEHI.EVENT_TABLE')
        if (index >= eventsCount.rows[0]['COUNT(*)'] || index < 0) {
            console.log("\nThat index number is not valid. Please try again.\n")
        } else {
            let table = await conn.execute('SELECT ' +
                'NAME ' +
                ',START_TIME AS "Start Time" ' +
                ',DESCRIPTION ' +
                ',CATEGORY ' +
                ',PRICE ' +
                ',LOCATION ' +
                ',BYU_ID ' +
                ',DAY_OF_WEEK ' +
                'URL FROM OIT#CHLOEHI.EVENT_TABLE')
            table.rows = table.rows.sort(sortArray)
                //checks if the primary key of the event table item is already on my events table
                let duplicate = false
                let myEventsCount = await conn.execute('SELECT COUNT(*) FROM OIT#CHLOEHI.MY_EVENTS')
                let primaryKeyCheck = await conn.execute('SELECT NAME, BYU_ID, START_TIME AS "Start Time" FROM OIT#CHLOEHI.MY_EVENTS')
                for (let i = 0; i < myEventsCount.rows[0]['COUNT(*)']; ++i) {
                    if (primaryKeyCheck.rows[0]['COUNT(*)'] !== 0){
                        if (table.rows[index]['NAME'] === primaryKeyCheck.rows[i]['NAME'] &&
                            table.rows[index]['BYU_ID'] === primaryKeyCheck.rows[i]['BYU_ID'] &&
                            table.rows[index]['START_TIME'] === primaryKeyCheck.rows[i]['START_TIME']) {
                            duplicate = true
                        }
                    }
                }
                if (duplicate) {
                    console.log("\nSorry, that event is already on your table. You cannot add it again.\n")
                } else {
                    let today = new Date();
                    let minutes = today.getMinutes()<10?'0':'' + today.getMinutes() // the number 10 here is used so I can check if there is a 0 before the time
                    let date = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate();
                    let time = today.getHours() + ":" + minutes
                    time = convertTime(time)
                    let timeAdded = date + " at " + time
                    let primaryKeyCheck = await conn.execute('SELECT NAME, BYU_ID, START_TIME FROM OIT#CHLOEHI.EVENT_TABLE')
                    let start = primaryKeyCheck.rows[index]['START_TIME']
                    let id = primaryKeyCheck.rows[index]['BYU_ID']
                    let name = primaryKeyCheck.rows[index]['NAME']
                    conn.execute('INSERT INTO OIT#CHLOEHI.MY_EVENTS (START_TIME, NAME, CATEGORY, PRICE, LOCATION, BYU_ID, DESCRIPTION, DAY_OF_WEEK, URL) ' +
                    'SELECT START_TIME ' +
                    ',NAME ' +
                    ',CATEGORY ' +
                    ',PRICE ' +
                    ',LOCATION ' +
                    ',BYU_ID' +
                    ',DESCRIPTION' +
                    ',DAY_OF_WEEK' +
                    ',URL ' +
                    'FROM OIT#CHLOEHI.EVENT_TABLE ' +
                    `WHERE START_TIME = '${start}' AND BYU_ID = '${id}' AND NAME = '${name}'`)
                    conn.execute('UPDATE OIT#CHLOEHI.MY_EVENTS ' +
                        `SET DATE_ADDED = '${timeAdded}' ` +
                        `WHERE START_TIME = '${start}' AND BYU_ID = '${id}' AND NAME = '${name}'`)
                    await conn.close()
                    console.log("\nEvent successfully added to My Events.\n")
                }

        }
    } catch(err) {
        if (err.response.status === 404) { // 404 is used because that is the error code that comes up when they put in incorrect input
            console.log("\nThat input is not recognizable. Please try again.\n")
        }
        else if (err.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
        else {
            console.log("\nThat index number is not valid. Please try again.\n")
        }
    }
}


/**
 * this function prints extra info for event
 * @param index
 * @param tableName
 * @param byuId
 * @returns {Promise<string>}
 */
const printDescriptionEvent = async function printDescriptionEvent(index, tableName) {
    try {
        let conn = await oracle.getConnection(params)
        let myEventsCount = await conn.execute(`SELECT COUNT(*) FROM ${tableName}`)
        if (index >= myEventsCount.rows[0]['COUNT(*)'] || index < 0) {
            console.log("\nThat index number is not valid. Please try again.\n")
            return "not printed"
        } else {
            let table
            let primaryKeyCheck = await conn.execute(`SELECT NAME, BYU_ID, START_TIME FROM ${tableName}`)
            let start = primaryKeyCheck.rows[index]['START_TIME']
            let id = primaryKeyCheck.rows[index]['BYU_ID']
            let name = primaryKeyCheck.rows[index]['NAME']
            table = await conn.execute('SELECT ' +
                'NAME AS "Name" ' +
                ',START_TIME AS "Start Time" ' +
                ',DESCRIPTION AS "Description" ' +
                ',URL ' +
                `,DAY_OF_WEEK AS "Day of Week" FROM ${tableName} ` +
                `WHERE START_TIME = '${start}' AND BYU_ID = '${id}' AND NAME = '${name}'`)
            table.rows = table.rows.sort(sortArray)

            console.log("\nAdditional Info\n")
            console.log(table.metaData[0].name + ": " + table.rows[0]["Name"] + "\n")
            console.log(table.metaData[4].name + ": " + table.rows[0]["Day of Week"] + "\n") // these numbers correlate to where the information is in the table
            console.log(table.metaData[1].name + ": " + table.rows[0]["Start Time"] + "\n")
            let description = table.rows[0]["Description"]
            let lineLength = 100
            let descriptionWithBreaks = wrap(description, {width: lineLength})
            console.log(table.metaData[2].name + ": " + descriptionWithBreaks + "\n")
            console.log(table.metaData[3].name + " For All Information: " + table.rows[0]["URL"] + "\n")
            await conn.close()
            return "printed"
        }
    }
    catch (e) {
        if (e.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
        else {
            console.log("\nThat index number is not valid. Please try again.\n")
        }
    }
}



module.exports = {printTable, addToMyEventsTable, deleteEventFromMyEvents, clearTable, addToEventTable, testVpn, getOracleCredentials, printDescriptionEvent}
