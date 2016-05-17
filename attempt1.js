'use strict'

const pg = require('pg')
const connstring = `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`
const bluebird = require('bluebird')
const Sequelize = require('sequelize')
const sequelize = new Sequelize(connstring)

// Set up the schema
var Event = sequelize.define('event', {
    name: Sequelize.STRING,
    capacity: Sequelize.INTEGER,
});
var Ticket = sequelize.define('ticket', {
    eventId: {
        type: Sequelize.INTEGER,
        references: {
            model: Event,
            key: 'id',
        },
    },
}, {
    indexes: [
        {fields: ['eventId']},
    ],
});
var Transaction = sequelize.define('transaction', {
    ticketId: {
        type: Sequelize.INTEGER,
        references: {
            model: Ticket,
            key: 'id',
        },
    }
});

// Set up the test database
var setupPromise = Event.sync()
.then(() => Ticket.sync())
.then(() => Transaction.sync())
.then(() => {
    return Promise.all([
        Event.create({
            name: 'Event 1',
            capacity: 3,
        }),
        Event.create({
            name: 'Event 2',
            capacity: 3,
        }),
        Event.create({
            name: 'Event 3',
            capacity: 3,
        }),
        Event.create({
            name: 'Event 4',
            capacity: 3,
        }),
        Event.create({
            name: 'Event 5',
            capacity: 3,
        }),
        Event.create({
            name: 'Event 6',
            capacity: 3,
        }),
        Event.create({
            name: 'Event 7',
            capacity: 3,
        }),
    ])
})
.then((eventInstances) => events = eventInstances.map(e => e.toJSON()))

var events;

// Run the tests
function bookEvent(eid) {
    return sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    }, (t) => {
        var ticket;

        return Ticket.create({
            eventId: eid,
        }, {
            transaction: t
        })
        .then((ticketInstance) => ticket = ticketInstance.toJSON())
        .then(() => {
            return sequelize.query(`
        SELECT
            events.id,
            events.capacity - COUNT(tickets.id) as count
        FROM events LEFT JOIN tickets
                ON tickets."eventId" = "events".id
        WHERE events.id = :eid
        GROUP BY events.id, events.capacity
            `, {
                replacements: {
                    eid: eid,
                },
                type: Sequelize.QueryTypes.SELECT,
                transaction: t
            })
        })
        .then((countResult) => {
            console.log(countResult[0])
            if (countResult[0].count >= 0) {
                // OK!
            }
            else {
                throw new Error("No tickets are available!")
            }
        })
        .then(() => {
            return Transaction.create({
                ticketId: ticket.id,
            }, {
                transaction: t,
            })
            console.log(ticket.id)
        })
    });
}

var testPromise = setupPromise.then(() => {
    return Promise.all([
        bookEvent(events[0].id), 
        bookEvent(events[1].id), 
        bookEvent(events[2].id), 
        bookEvent(events[3].id), 
        bookEvent(events[4].id), 
        bookEvent(events[5].id), 
        bookEvent(events[6].id), 
    ])
})


testPromise
.catch((error) => {
    console.log(error.stack)
})
.then(() => {
    return Ticket.findAll()
    .then((tickets) => {
        for (let ticket of tickets) {
            console.log(ticket.toJSON());
        }
        return;
    })
    .then(() => process.exit(0))
})
