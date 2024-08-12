/**
 * @file This file holds functions that deal with the events API
 * @author Chloe Hilton <hilton.chloe.y@gmail.com>
 * March 10, 2022
 */

let today = new Date();
let date = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate();
let dateInMonth = today.getFullYear() + "-" + (today.getMonth()+2) + "-" + today.getDate();
const axios = require("axios")
const oracleObj = require("./oracle")
let convertTime = require("convert-time")

/**
 * this function returns the correct url for the events API
 * @param eventCategory
 * @param byuId
 * @returns {Promise<string>}
 */
exports.getCalendar = async (eventCategory, byuId) => {
    // convert user input into an event number that the calendar will recognize
    let eventNum
    // the event num below is set to the number that the event API uses
    if (eventCategory === "Education"){
        eventNum = 4
    } else if (eventCategory === "Conferences"){
        eventNum = 1006
    } else if (eventCategory === "Athletics"){
        eventNum = 10
    } else if (eventCategory === "Arts & Entertainment"){
        eventNum = 9
    } else if (eventCategory === "Major Conferences"){
        eventNum = 6
    } else if (eventCategory === "Student Life"){
        eventNum = 49
    } else if (eventCategory === "Health and Wellness"){
        eventNum = 47
    } else if (eventCategory === "Other"){
        eventNum = 52
    } else {
        return "invalid"
    }
    let eventInfoParams =  {
        url: "https://fakeUrl" + eventNum + "&event[min][date]=" + date + "&event[max][date]=" + dateInMonth,
        method: "GET"
    }
    if (await getEventInfo(eventCategory, eventInfoParams, byuId) === "do not print") {
        return "no print"
    }
}


/**
 * this function calls the oracle function addToEventTable with the correct event info
 * @param eventCategory
 * @param calendar
 * @param byuId
 * @returns {Promise<string>}
 */
getEventInfo = async function(eventCategory, calendar, byuId) {
    try {
        console.log("\nGenerating events for you...please wait\n")
        const info = await axios(calendar)
        const allInfo = info.data
        if (allInfo.length === 0) {
            console.log("There are no events in this category for this month. Please try another category.\n")
            return "do not print"
        } else {
            for (let i = 0; i < allInfo.length; ++i) {
                let name = allInfo[i].Title
                name = name.replace(/["]/gm, "")
                name = name.replace(/[']/gm, "")
                let description = allInfo[i].Description
                if (description !== undefined && typeof(description) === "string") {
                    description = description.replace(/<[^>]*>?/gm, " ")
                    description = description.replace(/¿/gm, "'")
                    description = description.replace(/\\n|\\r/gm, " ")

                }
                let location = allInfo[i].LocationName
                if (location === "") {
                    location = "No Location Listed"
                }
                let startTime = allInfo[i].StartDateTime
                let url = allInfo[i].FullUrl
                let time = startTime.substring(11, 19) // 11 and 19 are used here so I can get just the time and not the date too
                if (time.substring(0,2) === "00"){ // 2 is used here to check if the hour is 00 in military time
                    time= "12:00 am"
                    startTime = startTime.replace(startTime.substring(11,19), time)
                } else {
                    startTime = startTime.replace(startTime.substring(11,19), convertTime(time, 'hh:MM a'))
                }
                let price

                let day = new Date(startTime)
                let dayOfWeek
                //convert to the same format that the classes are in - Monday through Friday because there are no classes Saturday or Sunday
                // the numbers below are used because getDay uses them to say what day it is and I used them to set the string of the day
                if (day.getDay() === 1){
                    dayOfWeek = "M"
                }
                else if (day.getDay() === 2) {
                    dayOfWeek = "T"
                } else if (day.getDay() === 3) {
                    dayOfWeek = "W"
                }else if (day.getDay() === 4) {
                    dayOfWeek = "Th"
                }else if (day.getDay() === 5) {
                    dayOfWeek = "F"
                }else if (day.getDay() === 6){
                    dayOfWeek = "Sa"
                } else if (day.getDay() === 0) {
                    dayOfWeek = "Su"
                }

                if (allInfo[i].HighPrice === "0.0") {
                    price = "Free!"
                }
                else {
                    price = allInfo[i].HighPrice
                }
                await oracleObj.addToEventTable(name, startTime, description, location, price, dayOfWeek, byuId, eventCategory, url)

            }

        }
    }
    catch(err) {
        if (err.errorNum === 12170){
            console.log("\nYour VPN is no longer on. Please turn it back on and try again.\n")
            process.exit(0)
        }
    }
}
