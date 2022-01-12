import crypto from 'crypto'
import { Collection, Db } from 'mongodb'
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from 'unique-names-generator'

import {
  PLAYER_KEY_LENGTH_BYTES,
  PLAYER_KEY_SALT,
  TRADE_POINTS,
  TRADE_POINTS_DIVISOR,
  TRADE_POINTS_MIN,
} from '../constants'
import { getRanchFromIndex } from '../utils'
import {
  DbPlayerVTO,
  DbTradeVTO,
  RanchName,
  ranchToTrait,
  Resource,
} from '../types'
import { Repository } from '../repository'
import { Player } from '../domain/player'

export class PlayerModel {
  private collection: Collection<DbPlayerVTO>
  private repository: Repository<DbPlayerVTO>

  constructor(db: Db) {
    this.collection = db.collection('players')
    this.repository = new Repository(this.collection, 'username')
  }

  public createPlayer(index: number): Player {
    // Generate the player data.
    // First we derive a deterministic 32-bytes sequence of bytes from a fixed salt plus the player nonce.
    const seed = crypto
      .createHash('sha256')
      .update(`${PLAYER_KEY_SALT}|${index}`)
      .digest()
    // We will be using the hexadecimal representation of the first `PLAYER_ID_LENGTH_BYTES` of the seed as the player key.
    const key: string = seed.slice(0, PLAYER_KEY_LENGTH_BYTES).toString('hex')
    // FIXME: avoid repeated usernames
    // The rest of the bytes of the seed will be used for seeding the unique names generator.
    const username: string = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      seed: seed.slice(PLAYER_KEY_LENGTH_BYTES).readUInt32BE(),
      separator: '-',
      style: 'lowerCase',
    })
    const medals: Array<string> = []
    const ranch = getRanchFromIndex(index)
    const points: number = 0

    return new Player({ key, username, ranch, medals, points })
  }

  /**
   * Generate as many players as specified in the `count` argument.
   * @param count How many players to generate
   * @param force If provided and set to `true`, circumvent the double bootstrapping protection.
   */
  public async bootstrap(
    count: number,
    force: boolean = false
  ): Promise<Array<Player> | null> {
    const vtos = await this.repository.bootstrap(
      /*
	     src/models/player.ts:70:7 - error TS2345: Argument of type '(_: null, index: number) => Player' is not assignable to parameter of type '(_: null, index: number) => { token?: string | undefined; lastTradeIn?: number | undefined; lastTradeOut?: number | undefined; id?: string | undefined; key: string; ranch: RanchName; medals: StaticArray<...>; username: string; points: number; }'.
  Call signature return types 'Player' and '{ token?: string | undefined; lastTradeIn?: number | undefined; lastTradeOut?: number | undefined; id?: string | undefined; key: string; ranch: RanchName; medals: StaticArray<TOptional<TString>>; username: string; points: number; }' are incompatible.
    The types of 'id' are incompatible between these types.
      Type 'ObjectId | undefined' is not assignable to type 'string | undefined'.
        Type 'ObjectId' is not assignable to type 'string'.

70       (_: null, index: number) => this.createPlayer(index),
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/
      (_: null, index: number) => this.createPlayer(index).toDbVTO(),
      count,
      force
    )

    return vtos?.map((vto) => new Player(vto)) || null
  }

  public async create(player: DbPlayerVTO): Promise<Player> {
    const { username } = player
    const bufficornExists = await this.repository.getOne({ username })

    if (bufficornExists) {
      throw new Error(`Player with name ${username} already exists`)
    }

    return new Player(await this.repository.create(player))
  }

  public async update(player: DbPlayerVTO): Promise<Player> {
    const { username } = player

    return new Player(await this.repository.updateOne({ username }, player))
  }

  public async get(key: string): Promise<Player | null> {
    const vto = await this.repository.getOne({ key })

    return vto ? new Player(vto) : null
  }

  public generateResource(
    player: DbPlayerVTO,
    lastTrade: DbTradeVTO | null
  ): Resource {
    // Compute points
    let amount
    if (!lastTrade) {
      amount = TRADE_POINTS
    } else {
      amount = Math.max(
        Math.ceil(lastTrade.resource.amount / TRADE_POINTS_DIVISOR),
        TRADE_POINTS_MIN
      )
    }

    // Get trait
    const ranchName = RanchName[player.ranch]
    const trait = ranchToTrait[ranchName]

    return {
      amount,
      trait,
    }
  }

  public async getOne(id: string): Promise<Player | null> {
    const vto = await this.repository.getById(id)

    return vto ? new Player(vto) : null
  }
}
