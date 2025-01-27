import React, { useState } from 'react'
import {
  Box,
  VStack,
  Heading,
  Text,
  Select,
  HStack,
  Badge,
  Grid,
  Flex,
  Button,
  useColorModeValue,
} from '@chakra-ui/react'
import { FaCalendar, FaTrophy } from 'react-icons/fa'
import type { User } from '../services/firebase'

interface HistoryProps {
  users: User[]
  onClose: () => void
}

const History = ({ users, onClose }: HistoryProps) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })

  const pageBgColor = useColorModeValue('white', 'gray.800')
  const bgColor = useColorModeValue('white', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.800', 'white')

  const getMonthOptions = () => {
    const options = new Set<string>()
    users.forEach(user => {
      user.tasks.forEach(task => {
        const [year, month] = task.date.split('-')
        options.add(`${year}-${month}`)
      })
    })
    return Array.from(options).sort().reverse()
  }

  const getDailyStats = (date: string) => {
    return users.map(user => ({
      name: user.name,
      points: user.tasks
        .filter(task => task.date === date && task.completed)
        .reduce((sum, task) => sum + task.points, 0),
      tasks: user.tasks.filter(task => task.date === date),
      training: user.training.filter(t => t.date === date),
      insights: user.insights.find(i => i.date === date),
    }))
  }

  const getDaysInMonth = () => {
    const [year, month] = selectedMonth.split('-')
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate()
    const days: string[] = []
    
    for (let i = 1; i <= daysInMonth; i++) {
      const day = String(i).padStart(2, '0')
      days.push(`${year}-${month}-${day}`)
    }
    
    return days.reverse() // Most recent first
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="xl" boxShadow="xl" borderWidth="1px" borderColor={borderColor} m={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg" color={textColor}>History</Heading>
        <Button onClick={onClose} colorScheme="purple" variant="ghost">
          Close
        </Button>
      </Flex>

      <HStack mb={6}>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          w="200px"
          bg={bgColor}
          color={textColor}
          borderColor={borderColor}
        >
          {getMonthOptions().map(month => (
            <option key={month} value={month}>
              {new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </Select>
      </HStack>

      <VStack spacing={4} align="stretch">
        {getDaysInMonth().map(date => {
          const dailyStats = getDailyStats(date)
          const winner = dailyStats.reduce((prev, current) => 
            (current.points > prev.points) ? current : prev
          )

          return (
            <Box key={date} p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
              <Flex justify="space-between" align="center" mb={4}>
                <HStack>
                  <FaCalendar />
                  <Text fontWeight="bold" color={textColor}>
                    {new Date(date).toLocaleDateString('default', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </HStack>
                {winner.points > 0 && (
                  <HStack>
                    <FaTrophy color="gold" />
                    <Text color={textColor}>{winner.name}</Text>
                  </HStack>
                )}
              </Flex>

              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                {dailyStats.map(stat => (
                  <Box key={stat.name}>
                    <Heading size="md" mb={2} color={textColor}>{stat.name}</Heading>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text color={textColor}>Daily Points:</Text>
                        <Badge colorScheme="purple" fontSize="md">
                          {stat.points} pts
                        </Badge>
                      </HStack>

                      {stat.tasks.length > 0 && (
                        <Box>
                          <Text fontWeight="bold" mb={2} color={textColor}>Completed Tasks:</Text>
                          <VStack align="stretch">
                            {stat.tasks
                              .filter(task => task.completed)
                              .map(task => (
                                <HStack key={task.id} justify="space-between">
                                  <Text color={textColor}>{task.text}</Text>
                                  <Badge colorScheme="green">{task.points} pts</Badge>
                                </HStack>
                              ))}
                          </VStack>
                        </Box>
                      )}

                      {stat.training.length > 0 && (
                        <Box>
                          <Text fontWeight="bold" mb={2} color={textColor}>Training:</Text>
                          <VStack align="stretch">
                            {stat.training.map(t => (
                              <HStack key={t.bodyPart} justify="space-between">
                                <Text color={textColor}>{t.bodyPart}</Text>
                                <Badge colorScheme="blue">{t.rating}/10</Badge>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      )}

                      {stat.insights && (
                        <Box>
                          <Text fontWeight="bold" mb={2} color={textColor}>Daily Reflection:</Text>
                          <VStack align="stretch">
                            <Box>
                              <Text fontWeight="semibold" color={textColor}>Question:</Text>
                              <Text color={textColor}>{stat.insights.question}</Text>
                            </Box>
                            <Box>
                              <Text fontWeight="semibold" color={textColor}>Erkenntnis:</Text>
                              <Text color={textColor}>{stat.insights.insight}</Text>
                            </Box>
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                ))}
              </Grid>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}

export default History 