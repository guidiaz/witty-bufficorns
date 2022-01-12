import { ObjectId, RanchName, DbPlayerVTO } from '../types'

export class Player {
  token?: string | undefined
  lastTradeIn?: number | undefined
  lastTradeOut?: number | undefined
  key: string
  username: string
  ranch: RanchName
  points: number
  medals: Array<string> = []
  id?: ObjectId

  constructor(vto: DbPlayerVTO) {
    this.lastTradeIn = vto.lastTradeIn || undefined
    this.lastTradeOut = vto.lastTradeOut || undefined
    this.key = vto.key
    this.username = vto.username
    this.ranch = vto.ranch
    this.points = vto.points
    this.medals = vto.medals
    this.token = vto.token
    this.id = new ObjectId(vto.id)
  }

  toDbVTO(shoWToken: boolean = false): DbPlayerVTO {
    const vto = {
      lastTradeIn: this.lastTradeIn,
      lastTradeOut: this.lastTradeOut,
      key: this.key,
      username: this.username,
      ranch: this.ranch,
      points: this.points,
      medals: this.medals,
      token: this.token,
      id: this.id?.toString(),
    }

    return shoWToken ? { ...vto, token: this.token } : vto
  }
}
