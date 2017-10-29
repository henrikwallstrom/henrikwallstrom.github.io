---
layout:     post
title:      Exploring Apple Health data with F# 
date:       2017-02-26 12:31:19
summary:    Exploring Apple Health data with F#
categories: fsharp health 
---

_![Rest HR zones by day]({{ site.url }}/images/healthdata_experiments/rest-hr-percent.png)_

If some doctor by luck read this, please check if the above is healthy. It is <span class='yellow-highlight'> time spent in each heart rate zone per day during the last 3 months</span>. I've filtered out sleep and exercise to have it include only resting heart rate. 

## Health Data
Apple Health App is recording my heart rate, steps, workouts, stand hours, sleep etc. All data can easily be [exported](https://www.google.com/search?q=export+apple+health+data) as a zipped xml-file.

Since F# have a good interactive [repl](https://docs.microsoft.com/en-us/dotnet/fsharp/tutorials/fsharp-interactive/) and some interesting data science libraries (eg. [FsLab](https://fslab.org/) and [Deedle](http://bluemountaincapital.github.io/Deedle/)) I decided to use it to experiment with the data. 

Source code for experiments: [https://github.com/henrikwallstrom/fsharp_apple_healthdata](https://github.com/henrikwallstrom/fsharp_apple_healthdata)

## Read data
My first failed attempt was to use [F# Data XmlProvider](http://fsharp.github.io/FSharp.Data/library/XmlProvider.html) to read the XML-file.

{% highlight ocaml lineanchors %}
#r "FSharp.Data.dll"
#r "System.Xml.Linq.dll"
open FSharp.Data

type HealthData = 
  XmlProvider<"../../../export.xml", 
  Global=true>
{% endhighlight %}

I'm not sure if it's the structure or size of the file but it was way too slow.

I instead went for reading XML manually which is quite pleasant in F#.

{% highlight ocaml lineanchors %}
#r "System.Xml.Linq.dll"
open System

let xmlDoc path =
    let xdoc = Xml.XmlDocument()
    xdoc.Load(path : string) |> ignore
    xdoc

let doc = xmlDoc "export.xml"
{% endhighlight %}

The DOCTYPE declaration of the file include an internal document type definition that describes the structure of the XML document and element types that exists.

It looks like the most interesting part is the **Record** elements.

{% highlight ocaml lineanchors %}
doc.OuterXml.Substring(0, 2548);;
{% endhighlight %}

{% highlight xml lineanchors %}
...
<!ELEMENT Record (MetadataEntry*)>
<!ATTLIST Record
  type          CDATA #REQUIRED
  unit          CDATA #IMPLIED
  value         CDATA #IMPLIED
  sourceName    CDATA #REQUIRED
  sourceVersion CDATA #IMPLIED
  device        CDATA #IMPLIED
  creationDate  CDATA #IMPLIED
  startDate     CDATA #REQUIRED
  endDate       CDATA #REQUIRED
>
{% endhighlight %}

The document consists of a **very long** list of health record nodes that can be matched with the XPath expression `/HealthData/Record`

{% highlight ocaml lineanchors %}
let healthRecordXml = 
    doc.SelectNodes "/HealthData/Record" 
        |> Seq.cast<System.Xml.XmlNode> 

Seq.length healthRecordXml //=> 729456
{% endhighlight %}

Almost one million records after 3 months. 

## Health Records
It looks like records data have `type`, `unit`, `sourceName`, `startDate` and `endDate` in common. 

{% highlight ocaml lineanchors %}
let healtRecordXmlSample = Seq.head healthRecordXml
healtRecordXmlSample.OuterXml
{% endhighlight %}

{% highlight xml lineanchors %}
<Record type="HKQuantityTypeIdentifierBodyMassIndex" 
sourceName="Lifesum" sourceVersion="7.1.0" unit="count" 
creationDate="2016-11-07 19:23:05 +0100" 
startDate="2016-10-29 23:00:00 +0100" 
endDate="2016-10-29 23:00:00 +0100" 
value="26.3036" />
{% endhighlight %}

We can make a pass over all health records and check what types that exists.

{% highlight ocaml lineanchors %}
let xmlNodeAttributeValue attributeName (elem: Xml.XmlNode)  = 
    match Option.ofObj(elem.Attributes.GetNamedItem(attributeName)) with
    | Some (v) -> Option.ofObj v.Value
    | _ -> None

let recordXmlByType = 
    healthRecordXml
    |> Seq.groupBy (xmlNodeAttributeValue "type" >> Option.get)
    |> dict
    
let recordTypeCount = 
    recordXmlByType
    |> Seq.map (fun (KeyValue(t, r)) -> (t, Seq.length r)) 
    |> Seq.toList
{% endhighlight %}

{% highlight ocaml lineanchors %}
[("HKQuantityTypeIdentifierBodyMassIndex", 6);
   ("HKQuantityTypeIdentifierHeight", 1);
   ("HKQuantityTypeIdentifierBodyMass", 7);
   ("HKQuantityTypeIdentifierHeartRate", 88333);
   ("HKQuantityTypeIdentifierStepCount", 170738);
   ("HKQuantityTypeIdentifierDistanceWalkingRunning", 209347);
   ("HKQuantityTypeIdentifierBasalEnergyBurned", 99847);
   ("HKQuantityTypeIdentifierActiveEnergyBurned", 142656);
   ("HKQuantityTypeIdentifierFlightsClimbed", 7352);
   ("HKQuantityTypeIdentifierDietaryFatTotal", 178);
   ("HKQuantityTypeIdentifierDietaryFatSaturated", 122);
   ("HKQuantityTypeIdentifierDietaryCholesterol", 35);
   ("HKQuantityTypeIdentifierDietarySodium", 106);
   ("HKQuantityTypeIdentifierDietaryCarbohydrates", 206);
   ("HKQuantityTypeIdentifierDietaryFiber", 83);
   ("HKQuantityTypeIdentifierDietarySugar", 124);
   ("HKQuantityTypeIdentifierDietaryEnergyConsumed", 242);
   ("HKQuantityTypeIdentifierDietaryProtein", 207);
   ("HKQuantityTypeIdentifierDietaryPotassium", 87);
   ("HKQuantityTypeIdentifierAppleExerciseTime", 7085);
   ("HKCategoryTypeIdentifierSleepAnalysis", 440);
   ("HKCategoryTypeIdentifierAppleStandHour", 2232);
   ("HKCategoryTypeIdentifierMindfulSession", 22)]
{% endhighlight %}

It would be nice to plot that as a PIE chart.

## FsLab and XPlot
FsLab is a collection of libraries for data-science. Among many things it includes XPlot. XPlot is a cross-platform data visualization package for F# powered by Google Charts and Plotly.

XPlot Documentation:
[http://tahahachana.github.io/XPlot/](http://tahahachana.github.io/XPlot/#Documentation)

{% highlight ocaml lineanchors %}
#load "packages/FsLab/Themes/DefaultWhite.fsx"
#load "packages/FsLab/FsLab.fsx"

open XPlot.GoogleCharts
{% endhighlight %}

Record types as a pie chart:

{% highlight ocaml lineanchors %}
recordTypeCount
    |> List.map (fun (k, v) -> 
        (k.Replace("HKQuantityTypeIdentifier", "")
            .Replace("HKCategoryTypeIdentifier", "") 
            + " " + v.ToString("N0"), v))
    |> List.sortByDescending snd
    |> Chart.Pie
    |> Chart.WithOptions (
        Options(
            width = 1200,
            height = 1200,
            legend = Legend(),
            sliceVisibilityThreshold = 0,
            pieHole = 0.4))
{% endhighlight %}

<img src="{{ site.url }}/images/healthdata_experiments/record_types_pie.png" alt="record types" style="width: 800px;"/>

I will focus on `HKQuantityTypeIdentifierHeartRate`, `HKQuantityTypeIdentifierAppleExerciseTime` and `HKCategoryTypeIdentifierSleepAnalysis` to get heart rate readings when not sleeping or exercising.

## Parse records
We could parse the XML elements into a list of dictionaries

{% highlight ocaml lineanchors %}
let healthRecordFields = ["type"; "unit"; "value"; 
  "sourceName"; "sourceVersion"; "device"; 
  "creationDate"; "startDate"; "endDate"]

let getStringField elem field =
    (field, xmlNodeAttributeValue field elem 
    |> function | Some (s) -> s | None -> "")

let getHealthRecord elem =
    healthRecordFields 
    |> Seq.map (getStringField elem) 
    |> dict

let getRecords ofType = 
    recordXmlByType.Item(ofType)
    |> Seq.map getHealthRecord

getRecords "HKQuantityTypeIdentifierHeartRate" 
{% endhighlight %}

We could then use that and plain F# to get quite far but I would like to try **Deedle**.

## Deedle
[Deedle](http://bluemountaincapital.github.io/Deedle/index.html) is a library for data and time series manipulation. There are two basic concepts, **Series** and **Frames**. A Series is a vector like collection of values indexed by a key. We will mainly work with time series where the keys are time stamps. A Frame is a matrix like collection of series that share the same row key. We will use frames to e.g. group properties of health records.  

{% highlight ocaml lineanchors %}
#load "packages/Deedle/Deedle.fsx"
open Deedle
{% endhighlight %}


A frame can be [constructed](http://bluemountaincapital.github.io/Deedle/reference/deedle-f__frame_extensions.html#section0) in a few ways. One way is using `Frame.ofValues` from a sequence of tuples:

{% highlight ocaml lineanchors %}
Frame.ofValues;;
val it :
  arg00:seq<'a * 'b * 'c> -> Frame<'a,'b> when 'a : equality and 'b : equality
{% endhighlight %}

It takes tuples of `row * column * value`.  We could turn our records into tuples like that by mapping over all Records and use the row index as row in the tuple. Then map over all entries in the dictionary in each row and use dictionary key as column and value as value.

{% highlight ocaml lineanchors %}
let getFrame records =
    records
    |> Seq.mapi (fun index record -> record 
      |> Seq.map (fun (KeyValue(k, v)) -> (index, k, v)))
    |> Seq.concat
    |> Frame.ofValues
{% endhighlight %}

{% highlight ocaml lineanchors %}
getRecords "HKQuantityTypeIdentifierHeartRate"
    |> Seq.head
    |> Seq.map (|KeyValue|) 
    |> Seq.toList 
{% endhighlight %}

{% highlight ocaml lineanchors %}
[("type", "HKQuantityTypeIdentifierHeartRate"); ("unit", "count/min");
   ("value", "74"); ("sourceName", "Henrik’s Apple Watch");
   ("sourceVersion", "3.1");
   ("device",
    "<<HKDevice: 0x174285dc0>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware:Watch2,4, software:3.1>");
   ("creationDate", "2016-11-06 09:41:19 +0100");
   ("startDate", "2016-11-06 09:41:19 +0100");
   ("endDate", "2016-11-06 09:41:19 +0100")]
{% endhighlight %}


## Heart records
Heart Rate records/samples are collected by my Apple Watch and Chest Strap. I suspect there are some overlaps between the two sources.   

Unit seems to be *count/min* on all records. 

{% highlight ocaml lineanchors %}
let hrUnits : string list =
    getRecords "HKQuantityTypeIdentifierHeartRate" 
    |> getFrame
    |> Frame.getCol "unit"
    |> Series.values
    |> Seq.distinct
    |> Seq.toList

// => hrUnits : string list = ["count/min"]
{% endhighlight %}

Start and end dates are the same on most records so I guess the value is for a given moment. Some HR entries seems to have a duration. I guess it is a bug. 

{% highlight ocaml lineanchors %}
let hasZeroDuration (row : ObjectSeries<_>) = 
    row
      .GetAs<DateTime>("endDate")
      .Subtract(row.GetAs<DateTime>("startDate"))
      .TotalMinutes = 0.0

let hrEntriesWithPeriods =
    getRecords "HKQuantityTypeIdentifierHeartRate" 
    |> getFrame
    |> Frame.filterRowValues (hasZeroDuration >> not)
{% endhighlight %}


{% highlight ocaml lineanchors %}

         type                              unit      value sourceName sourceVersion device creationDate              startDate                 endDate
8686  -> HKQuantityTypeIdentifierHeartRate count/min 82    Fitness    20161115.1602        2016-11-19 18:35:09 +0100 2016-11-19 18:34:37 +0100 2016-11-19 18:35:02 +0100
9210  -> HKQuantityTypeIdentifierHeartRate count/min 77    Fitness    20161115.1602        2016-11-19 18:45:01 +0100 2016-11-19 18:26:33 +0100 2016-11-19 18:43:04 +0100
13744 -> HKQuantityTypeIdentifierHeartRate count/min 125   Fitness    20161115.1602        2016-11-21 18:11:59 +0100 2016-11-21 09:29:42 +0100 2016-11-21 10:24:54 +0100
14074 -> HKQuantityTypeIdentifierHeartRate count/min 137   Fitness    20161115.1602        2016-11-21 18:51:19 +0100 2016-11-21 18:11:20 +0100 2016-11-21 18:48:26 +0100
18369 -> HKQuantityTypeIdentifierHeartRate count/min 114   Fitness    20161115.1602        2016-11-28 09:29:25 +0100 2016-11-24 08:47:45 +0100 2016-11-24 10:05:28 +0100
18373 -> HKQuantityTypeIdentifierHeartRate count/min 133   Fitness    20161115.1602        2016-11-28 09:29:26 +0100 2016-11-22 18:07:56 +0100 2016-11-22 18:50:20 +0100
18375 -> HKQuantityTypeIdentifierHeartRate count/min 116   Fitness    20161115.1602        2016-11-28 09:29:27 +0100 2016-11-22 07:39:35 +0100 2016-11-22 08:46:59 +0100
18384 -> HKQuantityTypeIdentifierHeartRate count/min 113   Fitness    20161115.1602        2016-11-28 09:45:28 +0100 2016-11-28 07:56:25 +0100 2016-11-28 09:39:27 +0100
18386 -> HKQuantityTypeIdentifierHeartRate count/min 94    Fitness    20161115.1602        2016-11-28 09:49:57 +0100 2016-11-28 09:43:25 +0100 2016-11-28 09:49:03 +0100
18792 -> HKQuantityTypeIdentifierHeartRate count/min 135   Fitness    20161115.1602        2016-11-28 18:51:14 +0100 2016-11-28 18:07:29 +0100 2016-11-28 18:49:57 +0100
{% endhighlight %}

As I suspected there are duplicate HR readings with the same start and end date:

{% highlight ocaml lineanchors %}
getRecords "HKQuantityTypeIdentifierHeartRate" 
    |> getFrame
    |> Frame.indexRowsDate "startDate"

// => System.ArgumentException: Duplicate key '11/19/2016 6:30:15 PM'. Duplicate keys are not allowed in the index.
{% endhighlight %}

But since I have only one heart I guess I can pick any of the readings and filter with `Seq.distinctBy`.

{% highlight ocaml lineanchors %}
let heartRateFrame = 
    getRecords "HKQuantityTypeIdentifierHeartRate" 
    |> Seq.distinctBy (fun r -> r.Item("startDate"))
    |> getFrame
    |> Frame.filterRowValues hasZeroDuration 
    |> Frame.indexRowsDate "startDate"
    |> Frame.sortRowsByKey
{% endhighlight %}


{% highlight ocaml lineanchors %}
                         type                              unit      value sourceName           sourceVersion device
                           creationDate              endDate
11/6/2016 9:41:19 AM  -> HKQuantityTypeIdentifierHeartRate count/min 74    Henrik’s Apple Watch 3.1           <<HKDevice: 0x174285dc0>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware
:Watch2,4, software:3.1>   2016-11-06 09:41:19 +0100 2016-11-06 09:41:19 +0100
11/6/2016 9:41:25 AM  -> HKQuantityTypeIdentifierHeartRate count/min 68    Henrik’s Apple Watch 3.1           <<HKDevice: 0x174289ba0>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware
:Watch2,4, software:3.1>   2016-11-06 09:41:25 +0100 2016-11-06 09:41:25 +0100
11/6/2016 9:46:17 AM  -> HKQuantityTypeIdentifierHeartRate count/min 79    Henrik’s Apple Watch 3.1           <<HKDevice: 0x174289740>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware
:Watch2,4, software:3.1>   2016-11-06 09:46:27 +0100 2016-11-06 09:46:17 +0100
11/6/2016 9:48:47 AM  -> HKQuantityTypeIdentifierHeartRate count/min 74    Henrik’s Apple Watch 3.1           <<HKDevice: 0x17428a5a0>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware
:Watch2,4, software:3.1>   2016-11-06 09:51:40 +0100 2016-11-06 09:48:47 +0100
11/6/2016 9:57:04 AM  -> HKQuantityTypeIdentifierHeartRate count/min 74    Henrik’s Apple Watch 3.1           <<HKDevice: 0x17428a640>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware
:Watch2,4, software:3.1>   2016-11-06 09:57:54 +0100 2016-11-06 09:57:04 +0100
11/6/2016 10:06:07 AM -> HKQuantityTypeIdentifierHeartRate count/min 81    Henrik’s Apple Watch 3.1           <<HKDevice: 0x17428a6e0>, name:Apple Watch, manufacturer:Apple, model:Watch, hardware
{% endhighlight %}

Value is a string. We can add the parsed number value as a new column. 

{% highlight ocaml lineanchors %}
heartRateFrame?HR <- heartRateFrame 
    |> Frame.mapRowValues (fun row -> 
        row.GetAs<double>("value"))
{% endhighlight %}

Heart rate readings are read more often when eg. exercising or using the chest strap we therefore give them a weight by calculating the duration between readings. 

{% highlight ocaml lineanchors %}
let secondsBetweenRows field maxValue aFrame   =
    aFrame 
    |> Frame.getCol field
    |> Series.pairwise    
    |> Series.map (fun _ (v1: DateTime, v2:DateTime) -> 
        Math.Min(v2.Subtract(v1).TotalSeconds, maxValue))
{% endhighlight %}

The watch usually read every 5th minute so let´s assume that gaps larger than 5 minutes (300s) are periods without readings  

{% highlight ocaml lineanchors %}
heartRateFrame?Seconds <- 
    secondsBetweenRows "endDate" 300.0 heartRateFrame
{% endhighlight %}

{% highlight ocaml lineanchors %}
heartRateFrame?Seconds
    |> Series.values
    |> Seq.map (fun v -> ("Seconds", v))
    |> Chart.Histogram
    |> Chart.WithOptions(
        Options(
            width = 1200,
            scaleType =  "mirrorLog",
            histogram = Histogram(bucketSize = 10)))
{% endhighlight %}

Most readings are done every 10th second or often since the watch read every 5th minute during rest but more often when exercising.

<img src="{{ site.url }}/images/healthdata_experiments/hr_readings_distribution.png" alt="record types" style="width: 800px;"/>

Before playing more with HR we need to add sleep, standing and exercise to the Frame

## Sleep
Information is stored when I go to bed, wake up and actually sleep.

{% highlight ocaml lineanchors %}
getRecords "HKCategoryTypeIdentifierSleepAnalysis" 
    |> Seq.map (fun r -> r.Item("value")) 
    |> Seq.distinct
    |> Seq.toList
{% endhighlight %}

{% highlight ocaml lineanchors %}
["HKCategoryValueSleepAnalysisInBed"; "HKCategoryValueSleepAnalysisAsleep";
   "HKCategoryValueSleepAnalysisAwake"]
{% endhighlight %}

Sleep readings from different sources can overlap.

## Merge records
Metrics such as sleep, exercise, stand can overlap when collected from different sources.

We could:
- Sort records by start date
- Merge records with previous record if start is before the previous end

We can merge two records by mapping over the first records values, keeping values that does not match the new field and emitting a new value for the updated field.

{% highlight ocaml lineanchors %}
let setField field value series =
    Series.map (fun k v -> 
        if k = field then 
            value :> obj 
        else v) series

{% endhighlight %}

We can now set `endDate`:

{% highlight ocaml lineanchors %}
let testSeries = series [
    "startDate", DateTime.MinValue :> obj; 
    "endDate", DateTime.MaxValue :> obj]

setField "endDate" DateTime.Now testSeries
{% endhighlight %}

Now we can merge overlapping records by sorting the list and merging records with the previous record if they overlap. 

{% highlight ocaml lineanchors %}
let mergeOverlappingValues (aFrame: Frame<_, string>) =
    aFrame
    |> Frame.sortRows "startDate"
    |> Frame.rows
    |> Series.foldValues (fun (state: 
        ObjectSeries<string> list) nextRow  -> 
        match state, nextRow with
        | [], next -> [next]
        | current::tail, next -> 
            let currentEnd = 
                current.GetAs<DateTime>("endDate")
            let nextStart = 
                next.GetAs<DateTime>("startDate")
            if currentEnd >= nextStart  then // overlaps
                let nextEnd = 
                    next.GetAs<DateTime>("endDate")
                if currentEnd >= nextEnd then 
                    current::tail //within
                else 
                    let merged = 
                        setField "endDate" nextEnd current
                    ObjectSeries(merged)::tail // merge
            else 
                next::current::tail 
    ) [] 
    |> List.rev
    |> Frame.ofRowsOrdinal;
{% endhighlight %}

Example:
 
{% highlight ocaml lineanchors %}
let testDates =  
    [
        (1, "startDate", DateTime(2013,1,1, 19, 00, 00));
        (1, "endDate", DateTime(2013,1,1, 20, 00, 00))
        (2, "startDate", DateTime(2013,1,1, 19, 30, 00));
        (2, "endDate", DateTime(2013,1,1, 19, 45, 00))
        (3, "startDate", DateTime(2013,1,1, 21, 00, 00));
        (3, "endDate", DateTime(2013,1,1, 22, 00, 00))
        (4, "startDate", DateTime(2013,1,1, 21, 30, 00));
        (4, "endDate", DateTime(2013,1,1, 22, 30, 00));
        (5, "startDate", DateTime(2013,1,1, 22, 30, 00));
        (5, "endDate", DateTime(2013,1,1, 23, 30, 00))]
    |> Frame.ofValues
{% endhighlight %}

{% highlight ocaml lineanchors %}
mergeOverlappingValues testDates
{% endhighlight %}

{% highlight ocaml lineanchors %}
//     startDate           endDate
// 0 -> 1/1/2013 7:00:00 PM 1/1/2013 8:00:00 PM
// 1 -> 1/1/2013 9:00:00 PM 1/1/2013 10:30:00 PM
{% endhighlight %}

## Back to sleep
Sleep recorded by different apps and merged:

{% highlight ocaml lineanchors %}
let sleepRecordsFrame = 
    getRecords "HKCategoryTypeIdentifierSleepAnalysis" 
    |> Seq.filter (fun r -> r.Item("value") =
     "HKCategoryValueSleepAnalysisAsleep")
    |> getFrame
    |> mergeOverlappingValues
    |> Frame.indexRowsDate "startDate"
    |> Frame.sortRowsByKey
{% endhighlight %}

Calculate sleep duration:

{% highlight ocaml lineanchors %}
sleepRecordsFrame?Duration <- sleepRecordsFrame 
    |> Frame.mapRows (fun start row -> 
         row.GetAs<DateTime>("endDate").Subtract(start))
{% endhighlight %}

Histogram of the durations:

{% highlight ocaml lineanchors %}
sleepRecordsFrame?Duration
    |> Series.values
    |> Seq.map (fun v -> ("Hours", v.TotalHours))
    |> Chart.Histogram
    |> Chart.WithOptions(
        Options(
            width = 1200,
            scaleType =  "mirrorLog",
            histogram = Histogram(bucketSize = 1)))
{% endhighlight %}

<img src="{{ site.url }}/images/healthdata_experiments/sleep_records_histogram.png" alt="record types" style="width: 1200px;"/>

Looks like nights for a parent of a 3-year-old. 


## Exercise
{% highlight ocaml lineanchors %}
let exerciseRecordsFrame = 
  getRecords "HKQuantityTypeIdentifierAppleExerciseTime"  
  |> getFrame
  |> mergeOverlappingValues
  |> Frame.indexRowsDate "startDate"
  |> Frame.sortRowsByKey
{% endhighlight %}

{% highlight ocaml lineanchors %}
exerciseRecordsFrame?Duration <- exerciseRecordsFrame 
  |> Frame.mapRows (fun k r -> 
    r.GetAs<DateTime>("endDate").Subtract(k))
{% endhighlight %}

## Stand
{% highlight ocaml lineanchors %}
let standRecordsFrame = 
  getRecords "HKCategoryTypeIdentifierAppleStandHour"
  |> getFrame
  |> Frame.filterRows (fun _ r -> 
     r.GetAs<string>("value")
       .Equals("HKCategoryValueAppleStandHourStood"))
  |> mergeOverlappingValues
  |> Frame.indexRowsDate "startDate"
  |> Frame.sortRowsByKey
{% endhighlight %}

{% highlight ocaml lineanchors %}
standRecordsFrame?Duration <- standRecordsFrame 
  |> Frame.mapRows (fun k r -> 
       r.GetAs<DateTime>("endDate").Subtract(k))
{% endhighlight %}

## Merge in activities
For every time stamp in HR readings I would like to know if I was awake, exercising or standing. I want a IsASleep, IsExercising and IsStanding column/flag on each HR reading row.

Since activity frames have a duration (start - end) while hr readings are momental (timestamp) we need to first transform them.

We need to split rows of durations:

{% highlight ocaml lineanchors %}
["value", "HKCategoryValueSleepAnalysisInBed"; 
 "startDate", 23:30, endDate: 23:45]` 
{% endhighlight %}

Into timestamp rows:

{% highlight ocaml lineanchors %}
[23:30, true] 
[23:45, false]`
{% endhighlight %}

Frame to Time Stamp Frame:

{% highlight ocaml lineanchors %}
let tsFrame key aFrame  =
    aFrame 
    |> Frame.mapRows (fun startDate row -> 
        [(startDate, key, true); 
        (row.GetAs<DateTime>("endDate"), key, false)])
    |> Series.values
    |> Seq.concat
    |> Frame.ofValues
    |> Frame.sortRowsByKey
{% endhighlight %}

Example:

{% highlight ocaml lineanchors %}
tsFrame "IsAsleep" sleepRecordsFrame
{% endhighlight %}

{% highlight ocaml lineanchors %}
// 2/25/2017 10:51:32 AM  -> False
// 2/26/2017 2:33:37 AM   -> True
// 2/26/2017 7:44:02 AM   -> False
// 2/26/2017 7:51:59 AM   -> True
// 2/26/2017 9:19:33 AM   -> False
// 2/28/2017 12:41:51 AM  -> True
// 2/28/2017 1:37:35 AM   -> False
// 2/28/2017 1:45:33 AM   -> True
// 2/28/2017 6:24:06 AM   -> False
{% endhighlight %}

Deedle can merge frames. We could eg. join `heartRateFrame` with `sleepRecordsFrame` like this:

{% highlight ocaml lineanchors %}
Frame.joinAlign 
    JoinKind.Right Lookup.ExactOrSmaller 
    heartRateFrame 
    (tsFrame "IsAsleep" sleepRecordsFrame)
{% endhighlight %}

It would give us a new frame with all HR readings and a sleep flag when there is a sleep row that exactly match the key/startDate or if there is a smaller/previous key.

Let's say I was a sleep at 23:30 and have a HR reading 23:31 I can assume I was still a asleep

Let's add all flags:

{% highlight ocaml lineanchors %}
let mergeTsFrame f1 f2 = Frame.joinAlign JoinKind.Right Lookup.ExactOrSmaller f1 f2
let hrFrameWithActivity = 
    heartRateFrame
    |> mergeTsFrame (tsFrame "IsAsleep" sleepRecordsFrame)
    |> mergeTsFrame (tsFrame "IsStanding" standRecordsFrame)
    |> mergeTsFrame (tsFrame "IsExercising" exerciseRecordsFrame)
{% endhighlight %}

Looks like I'm sleep walking :)

{% highlight ocaml lineanchors %}
hrFrameWithActivity
    |> Frame.filterRowsBy "IsAsleep" true
    |> Frame.filterRowsBy "IsStanding" true
    |> Frame.countRows

// => 553
{% endhighlight %}

## Resting HR
I want my resting heart rate. We can do that by filtering out sleep and exercise. 

But it looks like I have HR readings above 110 with time stamps within 10s. I assume that is exercise that is not logged correctly. I will filter them out as well. 

{% highlight ocaml lineanchors %}
hrFrameWithActivity?startDate <- 
  hrFrameWithActivity.RowKeys;

let restingRecordsFrame =
        hrFrameWithActivity
        |> Frame.sortRowsByKey
        |> Frame.filterRowsBy "IsAsleep" false
        |> Frame.filterRowsBy "IsExercising" false
        |> Frame.rows
        |> Series.foldValues (fun (state: 
            ObjectSeries<string> list) nextRow  -> 
            match state, nextRow with
            | [], next -> [next]
            | current::tail, next -> 
                // If HR is > 110 and readings are more 
                // often than every 10s then probably 
                // exercising but not logged
                if 
                    current.GetAs<float>("HR") > 110.0 
                    && next.GetAs<float>("HR") > 110.0 
                    &&
                    current.GetAs<DateTime>("startDate")
                      .Subtract(next
                        .GetAs<DateTime>("startDate")
                      ).TotalSeconds < 10.0
                then next::tail
                else next::current::tail 
        ) [] 
        |> List.rev
        |> Frame.ofRowsOrdinal
        |> Frame.indexRowsDate "startDate"
        |> Frame.sortRowsByKey
{% endhighlight %}

Average resting HR per day:

{% highlight ocaml lineanchors %}
let restingMeanByDay =
    restingRecordsFrame 
    |> Frame.getCol "HR"
    |> Series.chunkWhileInto 
      (fun d1 d2 -> d1.Date = d2.Date) 
      Stats.mean

// =>
// 2/26/2017 12:03:13 AM  -> 67.8488372093023
// 2/27/2017 9:46:26 AM   -> 66.8031496062992
// 2/28/2017 12:02:20 AM  -> 68.3812949640288

{% endhighlight %}

## HR Zones
I want a stacked column chart with %-of-minutes-of-the-day in different HR zones per day.

I will use the same colors and HR zones as the iOS app [Heart Watch](http://heartwatch.tantsissa.com/). It is a great iOS app that you should buy. 

{% highlight ocaml lineanchors %}
let zones = [
    (100.0, "> 100", "#CC0000");
    (80.0, "80-99", "#674EA7");
    (55.0, "55-79", "#3D85C6");
    (40.0, "40-54", "#BF737A");
    (0.0, "< 40", "#804D52")]
{% endhighlight %}

Helpers to extract data from table:

{% highlight ocaml lineanchors %}
let zoneNameByHr (hr : double) = 
    let (_, name, _) = 
      zones 
      |> List.find (fun (limit, _, _) -> 
        hr > limit)
    name

let zoneColorByName zoneName = 
    let (_, _ , color) = 
      zones 
      |> List.find (fun (_, name, _) -> 
        name = zoneName)
    color

let zoneNames = 
  zones 
  |> List.map Pair.get2Of3 
  |> Seq.ofList 
  |> Seq.rev
{% endhighlight %}

We can construct a Pivot Table with:
 - Dates as rows
 - HR zone name as columns
 - Total minutes in HR zone as cell values

{% highlight ocaml lineanchors %}
let zoneByDay = 
    restingRecordsFrame
    |> Frame.pivotTable
        (fun k r -> k.Date)
        (fun k r -> zoneNameByHr (r.GetAs<float>("HR")))
        (fun frame -> (frame?Seconds 
            |> Series.values 
            |> Seq.sum) / 60.0)
    |> Frame.sliceCols zoneNames
{% endhighlight %}

And plot the table as a stepped area chart:

{% highlight ocaml lineanchors %}
let zoneOptions title vAxisTitle =
    Options(
            title = title,
            isStacked = true, // percent
            connectSteps = true,
            areaOpacity = 0.7,
            chartArea = ChartArea(width = "90%"),
            colors = (zoneByDay.Columns.Keys 
              |> Seq.map zoneColorByName 
              |> Array.ofSeq), 
            width = 1280, 
            vAxis = Axis(title = vAxisTitle),
            legend = Legend(position = "bottom"))
{% endhighlight %}

{% highlight ocaml lineanchors %}
zoneByDay
    |> Chart.SteppedArea 
    |> Chart.WithOptions(
        zoneOptions "Minutes per HR zone and day" 
        "minutes")
{% endhighlight %}

<img src="{{ site.url }}/images/healthdata_experiments/minutes_in_hr_zones_per_day.png" alt="record types" style="width: 1200px;"/>

A problem with the above chart is that I don't have the same number of readings every day since I don't wear it all hours and also exercise less some days.

We can get a table with the total logged resting HR minutes per day. 

{% highlight ocaml lineanchors %}
let zoneByDayTotal = 
    restingRecordsFrame?Seconds 
    |> Series.groupInto (fun k r -> k.Date) 
      (fun _ r -> (r |> Series.values |> Seq.sum) / 60.0)
{% endhighlight %}

Then apply it to our previous values to get them in % of the daily totals:

{% highlight ocaml lineanchors %}
let zoneByDayPercentage = zoneByDay / zoneByDayTotal * 100
{% endhighlight %}

Deedle allow mathematical operations to be applied to series similar to matrix operations. Deedle automatically aligns the series and  applies the operation on corresponding elements.


Zone minutes in % per day:

{% highlight ocaml lineanchors %}
zoneByDayPercentage
    |> Chart.SteppedArea 
    |> Chart.WithOptions(
        zoneOptions "% Minutes per HR zone and day" 
        "% minutes")
{% endhighlight %}

<img src="{{ site.url }}/images/healthdata_experiments/percent_minutes_in_hr_zones_per_day.png" alt="record types" style="width: 1200px;"/>

Voila! We are DONE!!!
