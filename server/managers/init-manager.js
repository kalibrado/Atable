



async function initNewUser(userId, machineId, email, password, name) {

  const params = { userId, machineId, email, password, name }

  const user = await createUser(...params)
  params[userId] = user.userId
  await createNotifFile(...params)
  await createUserWeeks(...params)

}