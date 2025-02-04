import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Button,
  Heading,
  VStack,
  HStack,
  Text,
  Input,
  Checkbox,
  IconButton,
  useToast,
  Flex,
  Badge,
  Textarea,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  useColorMode,
  useColorModeValue,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
} from '@chakra-ui/react'
import { FaPlus, FaSignOutAlt, FaHistory, FaMoon, FaSun, FaComment, FaTrash, FaEye } from 'react-icons/fa'
import TrainingLog from './BodyMap'
import { 
  getUser, 
  getAllUsers, 
  addTask, 
  updateTask, 
  addTraining, 
  updateInsights, 
  performDailyReset, 
  deleteTraining,
  initializeDailyTasks,
  trackWeedUsage,
  updateSleepTime,
  updateWakeTime,
  deleteTask,
} from '../services/firebase'
import type { User } from '../services/firebase'
import History from './History'

interface WeedUsage {
  id: string
  date: string
  used: boolean
  note?: string
}

// Extend the imported User type without unused interfaces
type ExtendedUser = Omit<User, 'insights'> & {
  weedUsage: WeedUsage[]
  insights: Array<{
    question: string
    insight: string
    date: string
  }>
}

interface DashboardProps {
  currentUser: string
  onLogout: () => void
}

interface TaskNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: string) => void
  initialNote?: string
}

const TaskNoteDialog = ({ isOpen, onClose, onSave, initialNote = '' }: TaskNoteDialogProps) => {
  const [note, setNote] = useState(initialNote)
  const bgColor = useColorModeValue('white', 'gray.700')
  const textColor = useColorModeValue('gray.800', 'white')
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog
      isOpen={isOpen}
      onClose={onClose}
      leastDestructiveRef={cancelRef}
    >
      <AlertDialogOverlay>
        <AlertDialogContent bg={bgColor}>
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color={textColor}>
            Add Note
          </AlertDialogHeader>

          <AlertDialogBody>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this task..."
              color={textColor}
            />
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={() => {
                onSave(note)
                onClose()
              }}
              ml={3}
            >
              Save Note
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

const Dashboard = ({ currentUser, onLogout }: DashboardProps) => {
  const [users, setUsers] = useState<ExtendedUser[]>([])
  const [newTask, setNewTask] = useState('')
  const [newPoints, setNewPoints] = useState('5')
  const [showHistory, setShowHistory] = useState(false)
  const [viewingUser, setViewingUser] = useState(currentUser)
  const toast = useToast()
  const { colorMode, toggleColorMode } = useColorMode()
  const [taskToConfirm, setTaskToConfirm] = useState<{ id: string; player: string } | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const pageBgColor = useColorModeValue('white', 'gray.800')
  const bgColor = useColorModeValue('white', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.800', 'white')
  const taskBgColor = useColorModeValue('gray.50', 'gray.600')
  const [taskToAddNote, setTaskToAddNote] = useState<{ id: string; note?: string } | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const loadedUsers = await getAllUsers()
        setUsers(loadedUsers)
        
        // Initialize daily tasks
        await initializeDailyTasks(currentUser)
        
        // Reload users after initializing daily tasks
        const updatedUsers = await getAllUsers()
        setUsers(updatedUsers)
      } catch (error) {
        console.error('Error loading users:', error)
        toast({
          title: 'Error loading data',
          status: 'error',
          duration: 3000,
        })
      }
    }

    loadUsers()

    // Set up daily reset check
    const checkForDayChange = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      const timeUntilMidnight = nextMidnight.getTime() - now.getTime()

      // Schedule the next reset
      setTimeout(async () => {
        try {
          await performDailyReset()
          loadUsers() // Reload users after reset
          toast({
            title: 'New Day Started!',
            description: 'Daily tasks have been reset.',
            status: 'info',
            duration: 5000,
          })
        } catch (error) {
          console.error('Error performing daily reset:', error)
        }
        // Set up the next day's check
        checkForDayChange()
      }, timeUntilMidnight)
    }

    checkForDayChange()
  }, [])

  const handleAddTask = async () => {
    if (!newTask.trim()) return
    
    try {
      await addTask(currentUser, {
        text: newTask,
        points: parseInt(newPoints) || 5,
        completed: false,
        date: today,
        isRecurring: false,
      })

      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))
      }

      setNewTask('')
      setNewPoints('5')
    } catch (error) {
      console.error('Error adding task:', error)
      toast({
        title: 'Error adding task',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleToggleTask = async (taskId: string, player: string) => {
    const user = users.find(u => u.name === player)
    if (!user) return

    const task = user.tasks.find(t => t.id === taskId)
    if (!task) return

    if (!task.completed) {
      setTaskToConfirm({ id: taskId, player })
    } else {
      await updateTaskStatus(taskId, player, false)
      toast({
        title: 'Points Revoked',
        description: `${task.points} points have been removed`,
        status: 'info',
        duration: 2000,
      })
    }
  }

  const updateTaskStatus = async (taskId: string, player: string, completed: boolean) => {
    try {
      await updateTask(player, taskId, { completed })

      const updatedUser = await getUser(player)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === player ? updatedUser : user
        ))

        if (completed && player === currentUser) {
          toast({
            title: 'Task Completed!',
            description: `You earned ${users.find(u => u.name === player)?.tasks.find(t => t.id === taskId)?.points || 0} points!`,
            status: 'success',
            duration: 2000,
          })
        }
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error updating task',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleUpdateInsight = async (type: 'question' | 'insight', value: string) => {
    try {
      const user = users.find(u => u.name === currentUser)
      if (!user) return

      const currentInsight = user.insights.find(i => i.date === today) || {
        question: '',
        insight: '',
        date: today
      }

      await updateInsights(currentUser, {
        ...currentInsight,
        [type]: value,
        date: today
      })

      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))
      }
    } catch (error) {
      console.error('Error updating insight:', error)
      toast({
        title: 'Error updating insight',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleAddTraining = async (bodyPart: string, rating: number) => {
    try {
      await addTraining(currentUser, {
        bodyPart,
        rating,
        date: today
      })

      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))

        toast({
          title: 'Training Logged!',
          description: `Added ${bodyPart} training with rating ${rating}/10`,
          status: 'success',
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('Error adding training:', error)
      toast({
        title: 'Error adding training',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleDeleteTraining = async (trainingId: string) => {
    try {
      await deleteTraining(currentUser, trainingId)

      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))

        toast({
          title: 'Training Removed',
          status: 'success',
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('Error deleting training:', error)
      toast({
        title: 'Error removing training',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const getDailyPoints = (player: string) => {
    const user = users.find(u => u.name === player)
    if (!user) return 0

    return user.tasks
      .filter(task => task.date === today && task.completed)
      .reduce((sum, task) => sum + task.points, 0)
  }

  const getCurrentUser = () => users.find(u => u.name === currentUser)

  const handleAddNote = async (taskId: string, note: string) => {
    try {
      await updateTask(currentUser, taskId, { note })
      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))
      }
    } catch (error) {
      console.error('Error adding note:', error)
      toast({
        title: 'Error adding note',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleTrackWeed = async (used: boolean) => {
    try {
      await trackWeedUsage(currentUser, used, '')
      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))
      }
    } catch (error) {
      console.error('Error tracking weed usage:', error)
      toast({
        title: 'Error updating weed tracking',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(currentUser, taskId)
      const updatedUser = await getUser(currentUser)
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.name === currentUser ? updatedUser : user
        ))
        toast({
          title: 'Task Deleted',
          status: 'success',
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error deleting task',
        status: 'error',
        duration: 3000,
      })
    }
  }

  if (showHistory) {
    return (
      <Box minH="100vh" bg={pageBgColor}>
        <History users={users} onClose={() => setShowHistory(false)} />
      </Box>
    )
  }

  const otherUser = viewingUser === 'Dominik' ? 'Samu' : 'Dominik'

  return (
    <Box minH="100vh" bg={pageBgColor} p={{ base: 2, md: 6 }}>
      <Flex 
        direction={{ base: 'column', md: 'row' }} 
        justify="space-between" 
        align={{ base: 'stretch', md: 'center' }} 
        mb={8}
        gap={4}
      >
        <VStack align={{ base: 'center', md: 'flex-start' }}>
          <Heading size={{ base: 'lg', md: 'xl' }} color={useColorModeValue('purple.600', 'purple.300')}>Welcome, {currentUser}!</Heading>
          <StatGroup w={{ base: 'full', md: 'auto' }}>
            <Stat>
              <StatLabel color={textColor}>Total Points</StatLabel>
              <StatNumber color={textColor}>{getCurrentUser()?.stats.totalPoints || 0}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel color={textColor}>Daily Wins</StatLabel>
              <StatNumber color={textColor}>{getCurrentUser()?.stats.dailyWins || 0}</StatNumber>
            </Stat>
          </StatGroup>
        </VStack>
        <HStack spacing={4} justify={{ base: 'center', md: 'flex-end' }} w={{ base: 'full', md: 'auto' }}>
          <Button
            leftIcon={<FaEye />}
            onClick={() => setViewingUser(otherUser)}
            colorScheme="purple"
            variant="outline"
          >
            View {otherUser}'s Progress
          </Button>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
            onClick={toggleColorMode}
            colorScheme="purple"
            variant="ghost"
          />
          <IconButton
            aria-label="View History"
            icon={<FaHistory />}
            onClick={() => setShowHistory(true)}
            colorScheme="purple"
            variant="ghost"
          />
          <IconButton
            aria-label="Logout"
            icon={<FaSignOutAlt />}
            onClick={onLogout}
            colorScheme="purple"
            variant="ghost"
          />
        </HStack>
      </Flex>

      {users.map(user => {
        if (user.name !== viewingUser) return null;

        const dailyTasks = user.tasks.filter(t => t.date === today && t.isRecurring)
        const customTasks = user.tasks.filter(t => t.date === today && !t.isRecurring)

        return (
          <Box key={user.name}>
            <Heading size="lg" mb={4} color={textColor}>{user.name}'s Progress</Heading>
            <VStack spacing={6} align="stretch">
              <Box bg={bgColor} p={4} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                <HStack justify="space-between" align="center">
                  <VStack align="start" spacing={2}>
                    <Text color={textColor} fontWeight="bold">Sleep Schedule</Text>
                    <HStack spacing={4}>
                      <HStack>
                        <Text color={textColor}>Sleep:</Text>
                        <Input
                          type="time"
                          value={users.find(u => u.name === user.name)?.sleep?.sleepTime || ''}
                          onChange={async (e) => {
                            if (currentUser === user.name) {
                              try {
                                await updateSleepTime(user.name, e.target.value, today);
                                // Update local state after successful API call
                                const updatedUser = await getUser(user.name);
                                if (updatedUser) {
                                  setUsers(prev => prev.map(user => 
                                    user.name === user.name ? updatedUser : user
                                  ));
                                }
                              } catch (error) {
                                console.error('Error updating sleep time:', error);
                                toast({
                                  title: 'Error updating sleep time',
                                  status: 'error',
                                  duration: 3000,
                                });
                              }
                            }
                          }}
                          size="sm"
                          w="100px"
                          isDisabled={currentUser !== user.name}
                        />
                      </HStack>
                      <HStack>
                        <Text color={textColor}>Wake:</Text>
                        <Input
                          type="time"
                          value={users.find(u => u.name === user.name)?.sleep?.wakeTime || ''}
                          onChange={async (e) => {
                            if (currentUser === user.name) {
                              try {
                                await updateWakeTime(user.name, e.target.value, today);
                                // Update local state after successful API call
                                const updatedUser = await getUser(user.name);
                                if (updatedUser) {
                                  setUsers(prev => prev.map(user => 
                                    user.name === user.name ? updatedUser : user
                                  ));
                                }
                              } catch (error) {
                                console.error('Error updating wake time:', error);
                                toast({
                                  title: 'Error updating wake time',
                                  status: 'error',
                                  duration: 3000,
                                });
                              }
                            }
                          }}
                          size="sm"
                          w="100px"
                          isDisabled={currentUser !== user.name}
                        />
                      </HStack>
                    </HStack>
                  </VStack>
                  {users.find(u => u.name === user.name)?.sleep?.duration ? (
                    <Badge colorScheme="purple" p={2}>
                      {users.find(u => u.name === user.name)?.sleep?.duration} hours sleep
                    </Badge>
                  ) : null}
                </HStack>
              </Box>

              {currentUser === user.name && (
                <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                  <Heading size="md" mb={4} color={textColor}>Add New Task</Heading>
                  <HStack>
                    <Input
                      placeholder="Enter task description"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      bg={bgColor}
                      color={textColor}
                      borderColor={borderColor}
                    />
                    <Input
                      placeholder="Points"
                      value={newPoints}
                      onChange={(e) => setNewPoints(e.target.value)}
                      type="number"
                      w="100px"
                      bg={bgColor}
                      color={textColor}
                      borderColor={borderColor}
                    />
                    <IconButton
                      aria-label="Add task"
                      icon={<FaPlus />}
                      onClick={handleAddTask}
                      colorScheme="purple"
                    />
                  </HStack>
                </Box>
              )}

              <Box bg={bgColor} p={4} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                <HStack justify="space-between">
                  <Checkbox
                    isChecked={users.find(u => u.name === user.name)?.weedUsage?.find((w: WeedUsage) => w.date === today)?.used || false}
                    onChange={(e) => handleTrackWeed(e.target.checked)}
                    colorScheme="purple"
                    isDisabled={currentUser !== user.name}
                  >
                    <Text color={textColor}>I smoked weed today</Text>
                  </Checkbox>
                  {currentUser === user.name && (
                    <IconButton
                      aria-label="Add note"
                      icon={<FaComment />}
                      size="sm"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={() => {
                        const weedEntry = users.find(u => u.name === user.name)?.weedUsage?.find((w: WeedUsage) => w.date === today);
                        setTaskToAddNote({ id: weedEntry?.id || '', note: weedEntry?.note });
                      }}
                    />
                  )}
                </HStack>
              </Box>

              <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                <Flex justify="space-between" align="center" mb={4}>
                  <Heading size="md" color={textColor}>Daily Tasks</Heading>
                  <Badge colorScheme="purple" p={2}>
                    {getDailyPoints(user.name)} pts today
                  </Badge>
                </Flex>
                <VStack align="stretch" spacing={4}>
                  {dailyTasks.map(task => (
                    <HStack key={task.id} p={2} bg={taskBgColor} borderRadius="md">
                      <Checkbox
                        isChecked={task.completed}
                        onChange={() => handleToggleTask(task.id, user.name)}
                        colorScheme="purple"
                        isDisabled={currentUser !== user.name}
                      >
                        <Text as={task.completed ? 'del' : 'span'} color={textColor}>
                          {task.text}
                        </Text>
                      </Checkbox>
                      <Badge colorScheme="purple" ml="auto" mr={2}>
                        {task.points > 0 ? `+${task.points}` : task.points} pts
                      </Badge>
                      {task.note && (
                        <Popover>
                          <PopoverTrigger>
                            <IconButton
                              aria-label="View note"
                              icon={<FaComment />}
                              size="sm"
                              variant="ghost"
                              colorScheme="purple"
                            />
                          </PopoverTrigger>
                          <PopoverContent bg={bgColor} borderColor={borderColor}>
                            <PopoverArrow />
                            <PopoverCloseButton />
                            <PopoverBody color={textColor}>{task.note}</PopoverBody>
                          </PopoverContent>
                        </Popover>
                      )}
                      {currentUser === user.name && (
                        <IconButton
                          aria-label="Add note"
                          icon={<FaComment />}
                          size="sm"
                          variant="ghost"
                          colorScheme="purple"
                          onClick={() => setTaskToAddNote({ id: task.id, note: task.note })}
                        />
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                <Heading size="md" mb={4} color={textColor}>Custom Tasks</Heading>
                <VStack align="stretch" spacing={4}>
                  {customTasks.map(task => (
                    <HStack key={task.id} p={2} bg={taskBgColor} borderRadius="md">
                      <Checkbox
                        isChecked={task.completed}
                        onChange={() => handleToggleTask(task.id, user.name)}
                        colorScheme="purple"
                        isDisabled={currentUser !== user.name}
                      >
                        <Text as={task.completed ? 'del' : 'span'} color={textColor}>
                          {task.text}
                        </Text>
                      </Checkbox>
                      <Badge colorScheme="purple" ml="auto" mr={2}>
                        {task.points > 0 ? `+${task.points}` : task.points} pts
                      </Badge>
                      {task.note && (
                        <Popover>
                          <PopoverTrigger>
                            <IconButton
                              aria-label="View note"
                              icon={<FaComment />}
                              size="sm"
                              variant="ghost"
                              colorScheme="purple"
                            />
                          </PopoverTrigger>
                          <PopoverContent bg={bgColor} borderColor={borderColor}>
                            <PopoverArrow />
                            <PopoverCloseButton />
                            <PopoverBody color={textColor}>{task.note}</PopoverBody>
                          </PopoverContent>
                        </Popover>
                      )}
                      {currentUser === user.name && (
                        <>
                          <IconButton
                            aria-label="Add note"
                            icon={<FaComment />}
                            size="sm"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={() => setTaskToAddNote({ id: task.id, note: task.note })}
                          />
                          <IconButton
                            aria-label="Delete task"
                            icon={<FaTrash />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDeleteTask(task.id)}
                          />
                        </>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <TrainingLog
                onSelectBodyPart={handleAddTraining}
                selectedParts={user.training.filter(t => t.date === today)}
                isCurrentUser={user.name === currentUser}
                onDeleteTraining={user.name === currentUser ? handleDeleteTraining : undefined}
              />

              {user.name === currentUser && (
                <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                  <Heading size="md" mb={4} color={textColor}>Daily Reflection</Heading>
                  <VStack spacing={4}>
                    <Box w="full">
                      <Text mb={2} color={textColor}>Question of the Day</Text>
                      <Textarea
                        value={user.insights.find(i => i.date === today)?.question || ''}
                        onChange={(e) => handleUpdateInsight('question', e.target.value)}
                        placeholder="What's your question for today?"
                        bg={bgColor}
                        color={textColor}
                        borderColor={borderColor}
                      />
                    </Box>
                    <Box w="full">
                      <Text mb={2} color={textColor}>Erkenntnis of the Day</Text>
                      <Textarea
                        value={user.insights.find(i => i.date === today)?.insight || ''}
                        onChange={(e) => handleUpdateInsight('insight', e.target.value)}
                        placeholder="What did you learn today?"
                        bg={bgColor}
                        color={textColor}
                        borderColor={borderColor}
                      />
                    </Box>
                  </VStack>
                </Box>
              )}

              {user.name !== currentUser && user.insights.find(i => i.date === today)?.question && (
                <Box bg={bgColor} p={6} borderRadius="xl" boxShadow="md" borderWidth="1px" borderColor={borderColor}>
                  <Heading size="md" mb={4} color={textColor}>Daily Reflection</Heading>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <Text fontWeight="bold" color={textColor}>Question of the Day:</Text>
                      <Text color={textColor}>{user.insights.find(i => i.date === today)?.question}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold" color={textColor}>Erkenntnis of the Day:</Text>
                      <Text color={textColor}>{user.insights.find(i => i.date === today)?.insight}</Text>
                    </Box>
                  </VStack>
                </Box>
              )}
            </VStack>
          </Box>
        )
      })}

      {/* Task Note Dialog */}
      {taskToAddNote && (
        <TaskNoteDialog
          isOpen={true}
          onClose={() => setTaskToAddNote(null)}
          onSave={(note) => handleAddNote(taskToAddNote.id, note)}
          initialNote={taskToAddNote.note}
        />
      )}

      <AlertDialog
        isOpen={taskToConfirm !== null}
        onClose={() => setTaskToConfirm(null)}
        leastDestructiveRef={cancelRef}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg={bgColor}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color={textColor}>
              Confirm Task Completion
            </AlertDialogHeader>

            <AlertDialogBody color={textColor}>
              Did you really complete this task? This will add points to your score.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setTaskToConfirm(null)}>
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={async () => {
                  if (taskToConfirm) {
                    await updateTaskStatus(taskToConfirm.id, taskToConfirm.player, true)
                    setTaskToConfirm(null)
                  }
                }}
                ml={3}
              >
                Confirm
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default Dashboard 