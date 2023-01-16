
# *Accident-Analyzer*: :car: :map: Understanding Vehicle Accident Patterns in the United States

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

In this project, we reimagine *CrimAnalyzer*– a visualization
assisted analytic tool for crimes in Sao Paulo– in the con-
text of traffic accidents, ultimately producing *Accident-Analyzer*. In
doing so, we explore the spatio-temporal patterns of traffic
accidents across the United States from 2016 to 2021. The
Accident-Analyzer system will allow users to identify local
hotspots, visualize accident trends over time, and filter the
data by key categories in real-time. Our goals in this project
were to best recreate the analytic tool proposed in the [CrimAnalyzer paper](https://arxiv.org/abs/2010.06517), as well as extend its capabilities to the US
Accidents dataset, a collection of approximately 2.8 million
car accidents covering 49 US states.


## Authors

- Kyle Otstot ([@kotstot6](https://www.github.com/kotstot6))
- Shreyash Gade ([@shreyash1112](https://www.github.com/shreyash1112))
- Jaswanth Reddy Tokala ([@jaswanth1999](https://www.github.com/jaswanth1999))
- Anudeep Reddy Dasari ([@anudeep-dasari](https://www.github.com/anudeep-dasari))
- Hruthik Reddy Sunnapu ([@hruthik-reddy](https://www.github.com/hruthik-reddy))
- Nitesh Valluru ([@vallurunitesh](https://www.github.com/vallurunitesh))


## Tech Stack

**Client:** [D3.js (v7)](https://d3js.org/), [Leaflet.js](https://leafletjs.com/), [Pyodide](https://pyodide.org/en/stable/)

**Server:** PHP, MySQL


## Screenshots

![App Screenshot](https://i.postimg.cc/pXNw8Tzq/screenshot1.png)

![App Screenshot](https://i.postimg.cc/jStBgF8f/screenshot2.png)

## Demo

A simple demonstration of the system can be found [here](https://www.youtube.com/watch?v=2kcoVLqHx9w).


## Run Locally

Move to project directory, and clone the project

```bash
  cd /path/to/project
```

```bash
  git clone https://link-to-project
```

Download the CSV data [here](https://drive.google.com/file/d/1OEi8gVl7sKVRITu0wsKZyh4WtWqH_zDP/view?usp=sharing), and add it to the **data** directory of the project.

Install [MySQL](https://dev.mysql.com/downloads/mysql/), and set the password for root. Add it to **php/credentials.php**

```php
  $password = "<YOUR-MYSQL-ROOT-PASSWORD>";
```

Then run MySQL on terminal. For example, the MacOS command would be

```bash
  /usr/local/mysql/bin/mysql -h localhost -u root -p --local_infile
```

Create a database with the following commands

```sql
  CREATE DATABASE us_accidents_database;
  USE us_accidents_database;
```

Create a table with the following command

```sql
  CREATE TABLE us_accidents (
      Timestamp datetime,
      Year int,
      Month int,
      Day int,
      Time_of_Day int,
      Day_of_Week int,
      Duration int,
      Distance float,
      County int,
      State int,
      Cloudy int,
      Rain int,
      Snow int,
      Precipitation int,
      Thunder int,
      Visibility int
  );
```

Then add the CSV data to the table

```sql
  SET GLOBAL local_infile = true;
  LOAD DATA LOCAL INFILE '/path/to/project/data/us_accidents.csv'
  INTO TABLE us_accidents
  FIELDS TERMINATED BY ','
  ENCLOSED BY '"'
  LINES TERMINATED BY '\n'
  IGNORE 1 ROWS;
```

If successful, **2845341** rows should have been added.

Now install [PHP](https://www.php.net/manual/en/install.php) and run the following commands

```bash
  cd /path/to/project
```

```bash
  php -S localhost:8080
```

Lastly, enter **localhost:8080** into your browser (e.g., Chrome) and the visualization should appear.

***Note:*** If MySQLi errors are given, make sure that (insert mysqli term) these two commands(`extension=mysqli` and `extension_dir="ext"`) are uncommented in the **php.ini** file. Furthermore, if the PHP execution times out, try adjusting (increase the `max_execution_time` and `max_input_time`) in the **php.ini** file. Also if you are using php 5.3 and above you may need to rename the 'php.ini-production' file to 'php.ini'


## References

Garcıa, Germain and Silveira, Jaqueline and Poco, Jorge and Paiva, Afonso and Nery, Marcelo Batista and Silva, Claudio T. and Adorno, Sérgio and Nonato, Luis Gustavo, *CrimAnalyzer: Understanding Crime Patterns in São Paulo*. IEEE Transactions on Visualization and Computer Graphics, 2021
