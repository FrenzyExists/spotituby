## Overview

In the past meeting we discussed the logistics of the algorithm for the professional quiz. The TL;DR of it was to work on some demos to figure out how we would:
1. Get it working on wordpress (plugins)
2. Data structures/logic
3. User Interface (basically how the user will interact with the test and how to display the results)
;
### So uh... you guys got something?

# 🐸 🐸 🐸 🐸

*(Evil schemes sounds)*

## Things we got atm running (The quiz)

#### Backend or something like that

I was able to get a quick demo working on python as a general concept. V sent via the chat an algorithm ChatGPT made as a general outline. The demo I made does NOT implement that algorithm ~~because I didn't see it~~.

I've also got a basic structure of how to organize said questions in a JSON object. For those who don't know a JSON is a Javascript Object, its a special format that allows to manage with data, commonly utilized in the web by APIs. its something like this:

```json
{
    "1": {
    "question": "I prefer working independently rather than in a team.",
    "pointer": ["INDEPENDENT", "TEAM_PLAYER"]
    },
    "2": {
    "question": "I am comfortable taking risks to achieve my career goals.",
    "pointer": ["RISK_TAKER", "RISK_AVERSE"]
    },
    "3": {
    "question": "I enjoy taking on new challenges even if they are outside of my comfort zone.",
    "pointer": ["CHALLENGES", "COMFORT_ZONE"]
    },
}
```

In `python` the closest thing to a JSON are dictionaries, which are almost the same, but you can do more stuff.

In the JSON above you have a question and a pointer. The idea is that you could have something like this

#### Pretty frontend (roses not included)


An example of the frontend for the quiz

![[Pasted image 20240228182026.png]]

The idea of this format is to simplify the logic behind. For example, if you `strongly agree` that means you would be taking one extreme, and therefor the complement of such is the other extreme. For example on one extreme you're a lone wolf and in another extreme you're a team player that simply cannot work alone.

For the results one of the things suggested is something like this:

![[Pasted image 20240228182501.png]]

This is great! Because it somewhat follows the same complement-like strategy to simplify the logic behind the test.

The one missing thing is to categorize these results on what department one would be. I believe the people from psychology can cook up something for that.

Our job in the meantime would be to create some dummy categories, for example: `INEL`, `ICOM`, `INSO`

#### Plugins

A few plugins got suggested:


- #### Formidable Forms
- #### I forgot the other two lul

### For Formidable Forms:

[How to Create a Quiz Form - Formidable Forms](https://formidableforms.com/knowledgebase/how-to-create-a-quiz-form/)

So we can make a quiz and set scores. I haven't found a way to customize results tho 😔


### Frontend Preview

